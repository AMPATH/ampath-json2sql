import * as Squel from 'squel';
import Json2Sql from './json2Sql.js';

export default class SqlGenerators {
  select = null;
  constructor(select) {
    this.select = select;
  }
  generateColumns(columns) {
    for (let column of columns) {
      if (column.type === 'column') {
        this.select.field(column.dataSetColumn, column.alias);
      } else {
        this.select.field(column.expression, column.alias);
      }

    }
    return this;
  }
  generateWhere(filters, params) {
    for (let condition of filters.conditions) {
      this.select.where(condition.conditionExpession, params[condition.parameterName])
    }
    return this;
  }

  generateGroupBy(groupBy, params) {
    let groupParams = params[groupBy.groupParam] || [];
    if (groupParams.length > 0) {
      this._addGroupColumns(this.select, groupParams);
      return this;
    } else {
      this._addGroupColumns(this.select, groupBy.columns);
      return this;
    }
  }


  generateOrderBy(orderBy, params) {
    let orderParams = params[orderBy.orderByParam] || [];
    if (orderParams.length > 0) {
      this._addOrderColumns(this.select, orderParams);
      return this;
    } else {
      this._addOrderColumns(this.select, orderBy.columns);
      return this;
    }
  }

  generatePaging(paging, params) {
    if (paging) {
      let limit = params[paging.limitParam];
      let offset = params[paging.offSetParam];
      if (limit >= 0) {
        this.select.limit(limit);
      }
      if (offset >= 0) {
        this.select.offset(offset);
      }
      return this;
    } else {
      return this;
    }
  }


  generateDataSources(dataSources, dataSets, params) {
    let firstRun = true;
    let selectSubquery = null;
    for (let dataSource of dataSources) {
      if (dataSource.dataSet && dataSets) {
        let json2sql = new Json2Sql(dataSets[dataSource.dataSet], dataSets, params);
        selectSubquery = json2sql.generateSQL();
      }
      if (firstRun) {
        this.select.from(selectSubquery || dataSource.table, dataSource.alias);
        firstRun = false;
      }
      if (!firstRun && dataSource.join) {
        let joinType = dataSource.join.type.toUpperCase();
        switch (joinType) {
          case 'RIGHT':
            this.select.right_join(selectSubquery || dataSource.table, dataSource.alias, dataSource.join.joinCondition);
            break;
          case 'LEFT':
            this.select.left_join(selectSubquery || dataSource.table, dataSource.alias, dataSource.join.joinCondition);
            break;
          default:
            this.select.join(selectSubquery || dataSource.table, dataSource.alias, dataSource.join.joinCondition);
        }
      }
    }
    return this;
  }

  _addGroupColumns(select, columns) {
    for (let column of columns) {
      select.group(column);
    }
  }

  _addOrderColumns(select, columns) {
    for (let column of columns) {
      let asc = true;
      if (column.order && column.order.toUpperCase() === 'desc'.toUpperCase()) {
        asc = false;
      }
      select.order(column.column, asc);
    }
  }
}
