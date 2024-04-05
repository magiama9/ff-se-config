## Example Usage and Instructions For graphql-plugin

This is a plugin that can turn a GraphQL schema into a Flatfile Blueprint and use it to configure a new space

### Usage - Schema URL
Example usage for configuring a space from a GraphQL endpoint

```ts
    listener.use(
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
```

### Usage - Schema File
Example usage for configuring a space from a GraphQL SDL file
```ts
     listener.use(
       configureSpaceGraphQL({
         workbooks: [
           {
             name: "GraphQL Workbook From File",
             source: fs.readFileSync("./sampleSchemaTwo.graphql", "utf8"), // path to schema file
           },
         ],
       })
     );
```

### Usage - Schema Instance
Example usage for configuring a space from a GraphQL schema instance

```ts
    config.use(
      configureSpaceGraphQL({
        workbooks: [
          { name: "GraphQL Workbook From Schema", source: sampleSchema },
        ],
      })
    );

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
```
### Limitations
The plugin does not currently handle Interfaces, Enums, or Unions. If your schema uses these types, the field will be skipped on import and a message will be logged to the console. It also explicitly ignores Queries, Mutations, and Subscriptions.

Lists are handled very basically as strings where the field `Multi` property is `true`. If you have a list of other types, it will be imported as strings.
