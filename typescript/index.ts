/**
 * This code is used in Flatfile's Custom App Tutorial
 * https://flatfile.com/docs/apps/custom
 *
 * To see all of Flatfile's code examples go to: https://github.com/FlatFilers/flatfile-docs-kitchen-sink
 */

import { FlatfileListener, FlatfileEvent } from "@flatfile/listener";
import { FlatfileRecord } from "@flatfile/hooks";
import { recordHook } from "@flatfile/plugin-record-hook";
import { dedupePlugin } from "@flatfile/plugin-dedupe";
import { configureSpace } from "@flatfile/plugin-space-configure";
import api from "@flatfile/api";

import { PhoneNumberUtil } from "google-libphonenumber";
import axios from "axios";

import { contactsSheet } from "./contactsSheet";

const webhookReceiver = process.env.WEBHOOK_SITE_URL || "https://webhook.site/2a273bd9-5784-4ab3-8916-0ca019fb4c06";

const phoneUtil_ = PhoneNumberUtil.getInstance();

export default function flatfileEventListener(listener: FlatfileListener) {
  listener.on("**", (event: FlatfileEvent) => {
    // Log all events
    console.log(`Received event: ${event.topic}`);
  });

  listener.namespace(["space:config"], (config: FlatfileListener) => {
    // Configures space using plugin-space-configure
    // Sheets are imported as separate files and can be extended
    // Note that actions can exist in this config as a workbook level action, or in the sheet config as a sheet level action
    config.use(
      configureSpace({
        workbooks: [
          {
            name: "All Data",
            labels: ["pinned"],
            sheets: [contactsSheet],
            actions: [
              {
                operation: "submitAction",
                mode: "foreground",
                label: "Submit foreground",
                description: "Submit data to webhook.site",
                primary: true,
              },
            ],
          },
        ],
        space: {
          metadata: {
            theme: {
              root: {
                primaryColor: "midnightblue",
              },
              sidebar: {
                backgroundColor: "midnightblue",
                titleColor: "white",
                textColor: "white",
                activeTextColor: "red",
              },
            },
          },
        },
        documents: [
          {
            title: "SE Config Exercise",
            body:
              "# Welcome\n" +
              "### Solutions Engineering Configuration Exercise!\n" +
              "This is a custom extension of the getting started with Flatfile config.\n" +
              "---\n",
          },
        ],
      })
    );

    // Customer Requirement - Deduplicate records based on a field
    // Note: Currently implements dedupe plugin version 0.1.1
    // Version ^1.0.0 returns an unhandled type error
    config.use(
      // Action must be configured on SHEET level, not WORKBOOK level
      dedupePlugin("dedupe-email", {
        on: "email",
        keep: "last",
      })
    );

    // Part 3: Transform and validate (https://flatfile.com/docs/apps/custom/add-data-transformation)
    config.use(
      recordHook("contacts", (record: FlatfileRecord) => {
        // Validate and transform a Record's first name
        const value = record.get("firstName");
        if (typeof value === "string") {
          record.set("firstName", value.toLowerCase());
        } else {
          record.addError("firstName", "Invalid first name");
        }

        // Validate a Record's email address
        const email = record.get("email") as string;
        const validEmailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!validEmailAddress.test(email)) {
          console.log("Invalid email address");
          record.addError("email", "Invalid email address");
        }

        const phoneNumber = record.get("phoneNumber") as string;

        // Tries to parse the number using google-libphonenumber
        // Current behavior returns an error on an empty number. Wrap this try/catch block in a null check on phoneNumber if you want to consider empty phone number as valid
        try {
          // Parses in the context of US numbers(e.g. doesn't require a country code, but can work with valid country codes (+1, etc))
          const parsedNumber = phoneUtil_.parseAndKeepRawInput(
            phoneNumber,
            "US"
          );
          // isPossibleNumber is a faster check than isValidNumber
          // Only if it's possible do we move onto checking validity
          if (!phoneUtil_.isPossibleNumber(parsedNumber)) {
            console.log("Invalid phone number");
            record.addError("phoneNumber", "Invalid phone number");
          } else {
            if (!phoneUtil_.isValidNumber(parsedNumber)) {
              console.log("Invalid phone number");
              record.addError("phoneNumber", "Invalid phone number");
            }
          }
        } catch (e) {
          console.log(e.toString());
          record.addError("phoneNumber", e.toString());
        }

        return record;
      })
    );

    // Part 4: Configure a submit Action (https://flatfile.com/docs/apps/custom/submit-action)
    config
      .filter({ job: "workbook:submitAction" })
      .on("job:ready", async (event: FlatfileEvent) => {
        const { context, payload } = event;
        const { jobId, workbookId } = context;

        // Acknowledge the job
        try {
          await api.jobs.ack(jobId, {
            info: "Starting job to submit action to webhook.site",
            progress: 10,
          });

          //get the input data
          const job = await api.jobs.get(jobId);
          const priority = job.data.input["string"];
          console.log("priority");
          console.log(priority);

          // Collect all Sheet and Record data from the Workbook
          const { data: sheets } = await api.sheets.list({ workbookId });
          const records: { [name: string]: any } = {};
          for (const [index, element] of sheets.entries()) {
            records[`Sheet[${index}]`] = await api.records.get(element.id);
          }

          console.log(JSON.stringify(records, null, 2));

          // Send the data to our webhook.site URL
          const response = await axios.post(
            webhookReceiver,
            {
              ...payload,
              method: "axios",
              sheets,
              records,
              priority,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          // If the call fails throw an error
          if (response.status !== 200) {
            throw new Error("Failed to submit data to webhook.site");
          }

          // Otherwise, complete the job
          await api.jobs.complete(jobId, {
            outcome: {
              message: `Data was successfully submitted to Webhook.site. Go check it out at ${webhookReceiver}.`,
            },
          });
        } catch (error) {
          // If an error is thrown, fail the job
          console.log(`webhook.site[error]: ${JSON.stringify(error, null, 2)}`);
          await api.jobs.fail(jobId, {
            outcome: {
              message: `This job failed. Check your ${webhookReceiver}.`,
            },
          });
        }
      });
  });
}
