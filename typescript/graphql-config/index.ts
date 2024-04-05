/**
 * This is a barebones example for setting up a space based on a GraphQL schema
 * Schema can be gathered by providing a GraphQL endpoint, a GraphQL SDL schema file, or an instance of a GraphQL Schema
 */

import { FlatfileListener, FlatfileEvent } from "@flatfile/listener";
import { configureSpaceGraphQL } from "../graphql-plugin";
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from "graphql";
import * as fs from "fs";

export default function flatfileEventListener(listener: FlatfileListener) {
  listener.on("**", (event: FlatfileEvent) => {
    // Log all events
    console.log(`Received event: ${event.topic}`);
  });

  listener.namespace(["space:config"], (config: FlatfileListener) => {
    // Example usage for configuring a space from a GraphQL endpoint
    config.use(
      configureSpaceGraphQL({
        workbooks: [
          {
            name: "GraphQL Workbook From URL",
            source:
              "https://swapi-graphql.netlify.app/.netlify/functions/index", // Star wars movie API
          },
        ],
      })
    );

    // Example usage for configuring a space from a GraphQL SDL file
    // config.use(
    //   configureSpaceGraphQL({
    //     workbooks: [
    //       {
    //         name: "GraphQL Workbook From File",
    //         source: fs.readFileSync("./sampleSchemaTwo.graphql", "utf8"),
    //       },
    //     ],
    //   })
    // );

    // Example usage for configuring a space from a GraphQL schema instance
    // config.use(
    //   configureSpaceGraphQL({
    //     workbooks: [
    //       { name: "GraphQL Workbook From Schema", source: sampleSchema },
    //     ],
    //   })
    // );
  });
}

// Sample schema object for testing
const sampleSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "SampleSchema",
    fields: {
      name: {
        type: GraphQLString,
      },
      email: {
        type: GraphQLString,
      },
    },
  }),
});
