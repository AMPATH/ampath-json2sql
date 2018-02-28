import chai from 'chai';
import mlog from 'mocha-logger';
import * as Squel from 'squel';
chai.use(require('chai-string'));
chai.expect();
import {
  SqlGenerators
}
from '../src';

const expect = chai.expect;
const should = chai.should;
let generate;

describe('Generate Column Specs', () => {
  before(() => {
    generate = new SqlGenerators();

  });
  describe('Should return columns when generateColumns() is called with a columns json object', () => {
    it('should return the correct select statement', () => {
      let select = Squel.select();
      let columns = [{
        type: 'column',
        alias: 'age',
        dataSetColumn: "p.age"
      }, {
        type: "expression",
        alias: "age_range",
        expressionType: "simple_expression",
        expression: `case when age between 0 and 1 then '0_to_1'  else 'older_than_24'  end`
      }];
      expect(generate.generateColumns(select, columns))
        .equalIgnoreCase(`SELECT p.age as "age", case when age between 0 and 1 then '0_to_1'  else 'older_than_24'  end As "age_range"`)
    });
  });
});

describe('Generate Where Specs', () => {
  before(() => {
    generate = new SqlGenerators();
  });
  describe('Should return where clause when generateWhere() is called with a filters json object', () => {
    let select = Squel.select();
    //TODO add case for expression
    let filters = {
      conditionJoinOperator: "and",
      conditions: [{
        filterType: "tableColumns",
        conditionExpession: "endDate = ?",
        parameteName: 'endDate'
      }]
    };
    it('should return the correct select statement', () => {
      expect(generate.generateWhere(select, filters, {
          endDate: '2017-10-10'
        }))
        .equalIgnoreCase(`SELECT where (endDate = '2017-10-10')`)
    });
  });
});

describe('Generate Group by Specs', () => {
  before(() => {
    generate = new SqlGenerators();
  });
  describe('Should return grou[] clause when generateGroupBy() is called', () => {
    let groupBy = {
      groupParam: "groupByParam",
      columns: ["gender", "age"]
    };
    it('should return the correct group by statement', () => {
      let select = Squel.select();
      expect(generate.generateGroupBy(select, groupBy, {}))
        .equalIgnoreCase(`SELECT group by gender, age`)
    });

    it('It should ignore the report group columns if they are provided in the group params', () => {
      let select = Squel.select();
      expect(generate.generateGroupBy(select, groupBy, {
          groupByParam: ['age']
        }))
        .equalIgnoreCase(`SELECT group by age`)
    });
  });
});

describe('Order by Specs', () => {
  describe('Should return order clause when generateOrderBy() is called ', () => {
    let orderBy = {
      orderByParam: "orderByParam",
      columns: [{
        column: "gender",
        order: "asc"
      }, {
        column: "age",
        order: "desc"
      }]
    };
    it('should return the correct order by statement', () => {
      let select = Squel.select();
      expect(generate.generateOrderBy(select, orderBy, {}))
        .equalIgnoreCase(`SELECT order by gender asc, age desc`)
    });

    it('It should ignore the report order columns if they are provided in the order by params', () => {
      let select = Squel.select();
      expect(generate.generateOrderBy(select, orderBy, {
          orderByParam: [{
            column: "age",
            order: "asc"
          }]
        }))
        .equalIgnoreCase(`SELECT order by age asc`)
    });
  });
});

describe('Paging by Specs', () => {
  describe('Should paginate generatePaging() is called ', () => {
    it('should not set paging if paging is not defined', () => {
      let select = Squel.select();
      expect(generate.generatePaging(select, null, {}))
        .equalIgnoreSpaces(`SELECT`)
    });

    it('It should add paging if paging is provided in the report', () => {
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      let select = Squel.select();
      expect(generate.generatePaging(select, paging, {
          limitParam: 10,
          offSetParam: 0
        }))
        .equalIgnoreCase(`SELECT limit 10 offset 0`)
    });

    it('It should ignore the limit if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      expect(generate.generatePaging(select, paging, {
          offSetParam: 0
        }))
        .equalIgnoreCase(`SELECT offset 0`)
    });

    it('It should ignore the offset if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      expect(generate.generatePaging(select, paging, {
          limitParam: 10
        }))
        .equalIgnoreCase(`SELECT limit 10`)
    });

  });

});
