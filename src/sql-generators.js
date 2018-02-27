export default class SqlGenerators {
  constructor() {

  }
  generateColumns(select, columns) {
    for (let column of columns) {
      if (column.type == 'column') {
        select.field(column.dataSetColumn, column.alias);
      } else {
        console.log('Name',column.expression);
        select.field(column.expression, column.alias);
      }

    }
    return select.toString();
  }
  generateWhere() {
    return [1, 3, 3];
  }
}
