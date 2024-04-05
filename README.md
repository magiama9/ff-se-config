# Getting Started

This is a fork of the Flatfile getting started repository that implements functionality to address sample customer requirements.

# Part 1: Use Existing Plugins to Improve Configuration

After cloning the repository, set up your environment variables in `.env` per the getting started instructions, and run `npm i && npx flatfile@latest develop typescript/index.ts` from the root directory to start the listener.

Note: The listener is set up to work on an app with the namespace "config". If your namespace is different, please change it to match your namespace.

The various requirements it satisfies are enumerated below, along with code examples and instructions of their usage.

## Requirement One - Deduplicate Records

Deduplication of records is handled using [plugin-dedupe](https://github.com/FlatFilers/flatfile-plugins/tree/main/plugins/dedupe).

Note: This implementation is currently using plugin-dedupe v. 0.1.1 instead of the most recently released version.

The contacts sheet must be configured with an action named "dedupe-email". Deduplication of different fields can be implemented by changing the "on" param of the dedupePlugin to the field key you would like to deduplicate.

```ts
actions: [
  {
    operation: "dedupe-email",
    mode: "background",
    label: "Remove Duplicate Emails",
    description: "Remove duplicate emails",
  },
];
```

```ts
//...

import { dedupePlugin } from "@flatfile/plugin-dedupe";

//...

config.use(
  // Action must be configured on SHEET level, not WORKBOOK level
  dedupePlugin("dedupe-email", {
    on: "email",
    keep: "last",
  })
);
```

## Requirement Two - Validate Phone Numbers

Phone number validation is handled using a NPM implementation of [google-libphonenumber](https://github.com/google/libphonenumber). It runs on a recordHook when the records are updated. It is currently set up to consider numbers with country codes or US based numbers with no country codes as valid. Empty phone numbers are considered invalid.

```ts
//...
import { recordHook } from "@flatfile/plugin-record-hook";
import { PhoneNumberUtil } from "google-libphonenumber";
const phoneUtil_ = PhoneNumberUtil.getInstance();
//...
listener.use(
  recordHook("contacts", (record: FlatfileRecord) => {
    // Tries to parse the number using google-libphonenumber
    // Current behavior returns an error on an empty number. Wrap this try/catch block in a null check on phoneNumber if you want to consider empty phone number as valid
    try {
      // Parses in the context of US numbers(e.g. doesn't require a country code, but can work with valid country codes (+1, etc))
      const parsedNumber = phoneUtil_.parseAndKeepRawInput(phoneNumber, "US");
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
```

## Requirement Three - Streamlined Space Creation

Space creation is streamlined through the use of [plugin-space-configure](https://github.com/FlatFilers/flatfile-plugins/tree/main/plugins/space-configure).

```ts
//...

import { contactsSheet } from "./contactsSheet"
import { configureSpace } from "@flatfile/plugin-space-configure";
//...

listener.use(
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
```

# Part 2: Building a Custom Plugin
Stop your currently running listener if it's still running, and run `npx flatfile@latest develop typescript/graphql-config/index.ts` to start the new listener that implements converting GraphQL schemas to Flatfile Blueprints. While this listener is running, try creating a new space from the dashboard (again, using the "config" namespace).

You can find the instructions and limitations for usage in the [README](https://github.com/magiama9/ff-se-config/blob/main/typescript/graphql-config/README.md) for the implementation.

 By default, the listener is fetching the schema used by the [Star Wars API](https://studio.apollographql.com/public/star-wars-swapi/variant/current/home) and converting that into a custom Space. You can try commenting out the current code block and uncommenting the others to see how different use cases are handled (e.g. reading schemas from a file, or from a schema instance).

 This is very much an initial implementation of this functionality. Notably, the "LIST" type in a GraphQL schema is handled very naively, and Enums, Interfaces, and Unions aren't handled at all. 

 ### Roadmap for plugin improvement

 • References - References should perform a vlookup type operation to return a usable value, rather than an id

 • Lists - Flatfile doesn't natively handle has-many relationships. Lists should perhaps implement a filtering and concatenation of another sheet's records

 • Enums - Enums should be implemented using the Flatfile Enum type

 • Creation streamlining - A user should be probably able to upload a graphQL schema on creating an instance of an app/space. 

 • Interfaces and Unions - These should be implemented, but I am not sure of the exact customer use cases, so I would want to learn that before proceeding with implementation.