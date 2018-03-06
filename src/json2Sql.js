import SqlGenerators from './sql-generators.js';
import * as Squel from 'squel';
export default class Json2Sql {
  schema = null;
  params = null;
  dataSets = null;
  constructor(schema, dataSets, params) {
    this.schema = schema;
    this.params = params;
    this.dataSets = dataSets;
  }

  generateSQL() {
    let select = Squel.select();
    let generate = new SqlGenerators(select);
    if (this.schema && this.schema.sources) {
      generate.generateDataSources(this.schema.sources, this.dataSets, this.params);
    }

    if (this.schema && this.schema.filters) {
      generate.generateWhere(this.schema.filters, this.params);
    }

    if (this.schema && this.schema.columns) {
      generate.generateColumns(this.schema.columns);
    }

    if (this.schema && this.schema.groupBy) {
      generate.generateGroupBy(this.schema.groupBy, this.params);
    }

    if (this.schema && this.schema.groupBy) {
      generate.generateOrderBy(this.schema.orderBy, this.params);
    }

    if (this.schema && this.schema.paging) {
      generate.generatePaging(this.schema.paging, this.params);
    }
    return generate.select;
  }

}
