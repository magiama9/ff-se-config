import {
    GraphQLSchema,
    buildSchema,
    getIntrospectionQuery,
    graphqlSync,
  } from 'graphql'
  
  function introspect(schema: GraphQLSchema) {
    const query = getIntrospectionQuery()
    const result = graphqlSync({ schema, source: query })
    return result.data
  }
  
  export function introspectSchema(schema: GraphQLSchema) {
    return introspect(schema)
  }
  
  export function introspectSDL(SDL: string) {
    const schema = buildSchema(SDL)
    return introspect(schema)
  }
  
  export async function introspectUrl(url: string) {
    const query = getIntrospectionQuery()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
  
    if (!response.ok) {
      throw new Error(`Could not get GraphQL Schema: ${response.statusText}`)
    }
  
    const { data } = await response.json()
    return data
  }