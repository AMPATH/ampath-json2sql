import * as Squel from 'squel';
import Json2Sql from './json2Sql.js';

class CreateIndexBlock extends Squel.cls.Block {

  addIndexDirectives(directives) {
    let column = '';

    for (const directive of directives) {
      // eslint-disable-next-line max-len
      column = column + ` ${directive.type.toUpperCase()} INDEX ${this._buildJoinFor(directive.for)} ${this._buildIndexList(directive.indexList)} ,`;
    }
    this._columnIndex = column.slice(0, -1).trim();
  }

  _toParamString() {
    return {
      text: this._columnIndex || '',
      values: []
    };
  }

  _buildIndexList(list) {
    if (list) {
      return `(${list.join()})`;
    }
    return '';

  }

  _buildJoinFor(value) {
    let joinFor = '';

    if (!this._isEmpty(value)) {
      joinFor = `FOR ${value.toUpperCase()}`;
    }
    return joinFor;
  }

  _isEmpty(val) {
    if (val === undefined) {
      return true;
    }
    if (val === '') {
      return true;
    }
    return false;
  }
}

export default class SqlGenerators {
  select = null;
  constructor() {
    Squel.myselect = function (options) {
      return Squel.select(options, [
        new Squel.cls.StringBlock(options, 'SELECT'),
        new Squel.cls.FunctionBlock(options),
        new Squel.cls.DistinctBlock(options),
        new Squel.cls.GetFieldBlock(options),
        new Squel.cls.FromTableBlock(options),
        new CreateIndexBlock(options),
        new Squel.cls.JoinBlock(options),
        new Squel.cls.WhereBlock(options),
        new Squel.cls.GroupByBlock(options),
        new Squel.cls.HavingBlock(options),
        new Squel.cls.OrderByBlock(options),
        new Squel.cls.LimitBlock(options),
        new Squel.cls.OffsetBlock(options),
        new Squel.cls.UnionBlock(options)
      ]);
    };
    this.select = Squel.myselect({
      tableAliasQuoteCharacter: '`',
      fieldAliasQuoteCharacter: '`'
    });
  }
  generateColumns(columns, params = {}) {
    let filteredCoulmn = columns;

    if (params.columnWhitelist && params.columnWhitelist.length > 0) {
      filteredCoulmn = columns.filter(function (el) {
        return params.columnWhitelist.indexOf(el.alias) >= 0;
      });
    }
    for (let column of filteredCoulmn) {
      if (column.type === 'simple_column') {
        this.select.field(column.column, column.alias);
      } else if (column.type === 'derived_column' && column.expressionType === 'simple_expression' &&
        column.expressionOptions && column.expressionOptions.expression) {
        let injectedExpression = this._stringInject(column.expressionOptions.expression, params);

        this.select.field(injectedExpression || column.expressionOptions.expression, column.alias);
      } else {
        this.select.field(this.generateCase(column), column.alias);
      }
    }
    return this;
  }
  generateWhere(filters, params) {
    for (let condition of filters.conditions) {
      if (condition.conditionExpression) {
        let injectedExpression = this._stringInject(condition.conditionExpression, params);
        let param = params[condition.parameterName];

        if ((condition.parameterName && condition.parameterName !== '') && (!param || param === '')) {
          console.warn('Filter requires a parameter that was not supplied skipping');
          continue;
        }

        this.select.where(injectedExpression || condition.conditionExpression, param);
      } else {
        console.error('Where condition not found');
      }
    }
    return this;
  }

  generateGroupBy(groupBy, params) {
    let groupParams = params[groupBy.groupParam] || [];
    let excludeParam = params[groupBy.excludeParam];

    if (groupParams.length > 0 && groupBy.override) {
      this._addGroupColumns(this.select, groupParams, excludeParam);
      return this;
    }
    this._addGroupColumns(this.select, [...new Set(groupBy.columns.concat(groupParams))], excludeParam);
    return this;

  }

  generateOrderBy(orderBy, params) {
    let orderParams = params[orderBy.orderByParam] || [];

    if (orderParams.length > 0) {
      this._addOrderColumns(this.select, orderParams);
      return this;
    }
    this._addOrderColumns(this.select, orderBy.columns);
    return this;

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
    }
    return this;
  }

  generateCase(caseObject, params) {
    let squelCase = Squel.case();

    if (caseObject && caseObject.expressionOptions && caseObject.expressionOptions.caseOptions) {
      for (let option of caseObject.expressionOptions.caseOptions) {
        if (!(option.condition && option.condition.toUpperCase() === 'ELSE')) {
          squelCase.when(option.condition).then(option.value);
        } else {
          squelCase.else(option.value);
        }
      }
    }
    return squelCase;
  }

  generateDataSources(dataSources, dataSets, params) {
    let firstRun = true;
    let selectSubquery = null;

    for (let dataSource of dataSources) {
      params = SqlGenerators.mapParams(dataSource, params);
      if (dataSource.dataSet && dataSets) {
        let json2sql = new Json2Sql(dataSets[dataSource.dataSet], dataSets, params);

        selectSubquery = json2sql.generateSQL();
      }else{
        selectSubquery =  dataSource.table;
      }
      if (firstRun) {
        this.select.from(selectSubquery , dataSource.alias);
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

  addIndexDirectives(directives) {
    this.select.addIndexDirectives(directives);
    return this;
  }

  static mapParams(dataSource, params) {
    if (dataSource.forwardedParams) {
      for (const param of dataSource.forwardedParams) {

        let paramsToMap = param.mapping.split(':');

        params[paramsToMap[1]] = params[paramsToMap[0]];
      }
    }
    return params;
  }

  static mapParamsMultipleDataSources(dataSources, params) {
    for (const dataSource of dataSources) {
      SqlGenerators.mapParams(dataSource, params);
    }
    return params;
  }

  _addGroupColumns(select, columns, exclude = []) {
    columns = columns.filter((el) => !exclude.includes(el));
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

  _stringInject(str, data) {
    if (typeof str === 'string' && (data instanceof Object)) {

      for (let key in data) {
        return str.replace(/({([^}]+)})/g, function (i) {
          let key = i.replace(/{/, '').replace(/}/, '');

          if (!data[key]) {
            return i;
          }

          return data[key];
        });
      }
    }

    return false;
  }
}
