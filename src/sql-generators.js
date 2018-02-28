export default class SqlGenerators {
  constructor() {

  }
  generateColumns(select, columns) {
    for (let column of columns) {
      if (column.type === 'column') {
        select.field(column.dataSetColumn, column.alias);
      } else {
        console.log('Name', column.expression);
        select.field(column.expression, column.alias);
      }

    }
    return select.toString();
  }
  generateWhere(select, filters, params) {
    for (let condition of filters.conditions) {
      select.where(condition.conditionExpession, params[condition.parameteName])
    }
    return select.toString();
  }

  generateGroupBy(select, groupBy, params) {
    let groupParams = params[groupBy.groupParam] || [];
    if (groupParams.length > 0) {
      return this.addGroupColumns(select, groupParams);
    } else {
      return this.addGroupColumns(select, groupBy.columns);
    }
  }


  generateOrderBy(select, orderBy, params) {
    let orderParams = params[orderBy.orderByParam] || [];
    if (orderParams.length > 0) {
      return this.addOrderColumns(select, orderParams);
    } else {
      return this.addOrderColumns(select, orderBy.columns);
    }
  }

  generatePaging(select, paging, params) {
    if (paging) {
      let limit = params[paging.limitParam];
      let offset = params[paging.offSetParam];
      if(limit >= 0){
        select.limit(limit);
      }
      if(offset >= 0){
      select.offset(offset);
      }
      return select.toString();
    } else {
      return select.toString();
    }
  }

  addGroupColumns(select, columns) {
    for (let column of columns) {
      select.group(column);
    }
    return select.toString();
  }

  addOrderColumns(select, columns) {
    for (let column of columns) {
      let asc = true;
      if (column.order && column.order.toUpperCase() === 'desc'.toUpperCase()) {
        asc = false;
      }
      select.order(column.column, asc);
    }
    return select.toString();
  }

}
