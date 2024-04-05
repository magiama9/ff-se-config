/**
 * This code is used in Flatfile's Custom App Tutorial
 * https://flatfile.com/docs/apps/custom
 *
 * To see all of Flatfile's code examples go to: https://github.com/FlatFilers/flatfile-docs-kitchen-sink
 */

import { FlatfileListener } from "@flatfile/listener";
import { recordHook, FlatfileRecord } from "@flatfile/plugin-record-hook";
import { Client, FlatfileEvent } from "@flatfile/listener";
import api from "@flatfile/api";
import { PhoneNumberUtil } from "google-libphonenumber";
import axios from "axios";

// TODO: Update this with your webhook.site URL for Part 4
const webhookReceiver = process.env.WEBHOOK_SITE_URL || "YOUR_WEBHOOK_URL";

const phoneUtil_ = PhoneNumberUtil.getInstance();

export default function flatfileEventListener(listener: Client) {
  // Part 1: Setup a listener (https://flatfile.com/docs/apps/custom/meet-the-listener)
  listener.on("**", (event: FlatfileEvent) => {
    // Log all events
    console.log(`Received event: ${event.topic}`);
  });

  listener.namespace(["space:config"], (config: FlatfileListener) => {
    // Part 2: Configure a Space (https://flatfile.com/docs/apps/custom)
    config
      .filter({ job: "space:configure" })
      .on("job:ready", async (event: FlatfileEvent) => {
        const { spaceId, environmentId, jobId } = event.context;
        try {
          await api.jobs.ack(jobId, {
            info: "Gettin started.",
            progress: 10,
          });

          await api.workbooks.create({
            spaceId,
            environmentId,
            name: "All Data",
            labels: ["pinned"],
            sheets: [
              {
                name: "Contacts",
                slug: "contacts",
                fields: [
                  {
                    key: "firstName",
                    type: "string",
                    label: "First Name",
                  },
                  {
                    key: "lastName",
                    type: "string",
                    label: "Last Name",
                  },
                  {
                    key: "email",
                    type: "string",
                    label: "Email",
                  },
                ],
              },
              {
                name: "Sheet 2",
                slug: "sheet2",
                fields: [
                  {
                    key: "firstName",
                    type: "string",
                    label: "First Name",
                  },
                  {
                    key: "lastName",
                    type: "string",
                    label: "Last Name",
                  },
                  {
                    key: "email",
                    type: "string",
                    label: "Email",
                  },
                ],
              },
            ],
            actions: [
              {
                operation: "submitAction",
                mode: "foreground",
                label: "Submit foreground",
                description: "Submit data to webhook.site",
                primary: true,
              },
            ],
          });

          const doc = await api.documents.create(spaceId, {
            title: "Getting Started",
            body:
              "# Welcome\n" +
              "### Say hello to your first customer Space in the new Flatfile!\n" +
              "Let's begin by first getting acquainted with what you're seeing in your Space initially.\n" +
              "---\n",
          });

          await api.spaces.update(spaceId, {
            environmentId,
            metadata: {
              theme: {
                root: {
                  primaryColor: "red",
                },
                sidebar: {
                  backgroundColor: "red",
                  textColor: "white",
                  activeTextColor: "midnightblue",
                },
                // See reference for all possible variables
              },
            },
          });

          await api.jobs.complete(jobId, {
            outcome: {
              message: "Your Space was created. Let's get started.",
              acknowledge: true,
            },
          });
        } catch (error) {
          console.error("Error:", error.stack);

          await api.jobs.fail(jobId, {
            outcome: {
              message: "Creating a Space encountered an error. See Event Logs.",
              acknowledge: true,
            },
          });
        }
      });

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

        try {
          const parsedNumber = phoneUtil_.parseAndKeepRawInput(
            phoneNumber,
            "US"
          );
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
