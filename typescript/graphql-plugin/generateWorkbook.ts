import type { Flatfile } from "@flatfile/api";
import type { FlatfileEvent } from "@flatfile/listener";
import { GraphQLSchema } from "graphql";
import { generateSheets } from "./generateSheet";
import {
  introspectSDL,
  introspectSchema,
  introspectUrl,
} from "./introspection";
import type { PartialWorkbookConfig } from "./types";

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
export async function generateWorkbook(
  workbookConfig: PartialWorkbookConfig,
  event?: FlatfileEvent
): Promise<Flatfile.CreateWorkbookConfig> {
  const graphQLObjects = await getObjects(workbookConfig.source, event);
  const sheets = generateSheets(graphQLObjects, workbookConfig.sheets);

  return {
    name: "GraphQL Plugin Generated Workbook", // Default name, can override on call
    ...workbookConfig,
    sheets,
  };
}

async function getObjects(
  source: string | GraphQLSchema,
  _event?: FlatfileEvent
) {
  const queryResults = await (async () => {
    if (typeof source === "string") {
      // If it's a URL, introspect it and use the returned schema, otherwise we try to use the passed string as a schema
      return isValidUrl(source) ? introspectUrl(source) : introspectSDL(source);
    } else if (source instanceof GraphQLSchema) {
      // If an actual schema object is passed
      return introspectSchema(source);
    }
    throw new Error("Not a valid GraphQL Schema");
  })();

  // Filter out special GraphQL schema types
  return queryResults.__schema.types.filter(
    (type: { kind: string; name: string; }) =>
      type.kind === "OBJECT" &&
      !["Query", "Mutation", "Subscription"].includes(type.name) &&
      !type.name.startsWith("__") &&
      !type.name.startsWith("_")
  );
}
