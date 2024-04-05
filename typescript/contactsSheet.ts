import { Flatfile } from "@flatfile/api";

export const contactsSheet: Flatfile.SheetConfig = {
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
    {
      key: "phoneNumber",
      type: "string",
      label: "Phone Number",
    },
  ],
  actions: [
    {
      operation: "dedupe-email",
      mode: "background",
      label: "Remove Duplicate Emails",
      description: "Remove duplicate emails",
    },
  ],
};
