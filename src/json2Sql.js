import SqlGenerators from './sql-generators.js';
export default class Json2Sql {
  schema = null;
  Squel = null;
  params = null;
  dataSets = null;
  constructor(schema, dataSets, params) {
    this.schema = schema;
    this.params = params;
    this.dataSets = dataSets;
  }

  generateSQL() {
    let generate = new SqlGenerators();

    if (this.schema && this.schema.sources) {
      generate.handleParameterizedSources(this.schema.sources, this.params);
      generate.generateDataSources(this.schema.sources, this.dataSets, this.params);
    }

    if (this.schema && this.schema.filters) {
      generate.generateWhere(this.schema.filters, this.params);
    }

    if (this.schema && this.schema.columns) {
      generate.generateColumns(this.schema.columns, this.params);
    }

    if (this.schema && this.schema.groupBy) {
      generate.generateGroupBy(this.schema.groupBy, this.params);
    }

    if (this.schema && this.schema.orderBy) {
      generate.generateOrderBy(this.schema.orderBy, this.params);
    }

    if (this.schema && this.schema.paging) {
      generate.generatePaging(this.schema.paging, this.params);
    }

    if (this.schema && this.schema.indexDirectives) {
      generate.addIndexDirectives(this.schema.indexDirectives);
    }
    return generate.select;
  }

}
