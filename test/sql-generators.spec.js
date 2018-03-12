import chai from 'chai';
import mlog from 'mocha-logger';
import * as Squel from 'squel';
chai.use(require('chai-string'));
chai.expect();
import {
  SqlGenerators,
  Json2Sql
}
from '../src';

const expect = chai.expect;
const should = chai.should;
let generate;

describe('Generate Column Specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);

  });
  describe('Should return columns when generateColumns() is called with a columns json object', () => {
    it('should return the correct select statement', () => {
      let columns = [{
          type: 'column',
          alias: 'age',
          dataSetColumn: "p.age"
        }, {
          type: "expression",
          alias: "age_range",
          expressionType: "simple_expression",
          expression: `case when age between 0 and 1 then '0_to_1'  else 'older_than_24'  end`
        },
        {
          type: 'expression',
          alias: 'age_range2',
          expressionType: 'case_statement',
          caseOptions: [{
              condition: 'p.age beween 1 and 9',
              value: '1_to_9'
            },
            {
              condition: 'p.age beween 11 and 14',
              value: '11_to_14'
            },
            {
              condition: 'else',
              value: 'older_than_24'
            }
          ]
        }
      ];
      expect(generate.generateColumns(columns).select.toString())
        .equalIgnoreCase(`SELECT p.age AS "age", case when age between 0 and 1 then '0_to_1'  else 'older_than_24'  end AS "age_range", CASE WHEN (p.age beween 11 and 14) THEN '11_to_14' WHEN (p.age beween 1 and 9) THEN '1_to_9' ELSE 'older_than_24' END AS "age_range2"`)
    });
  });
});


describe('Case Statement Specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);

  });
  describe('The correct query when when generateCase() is called with a case statement object', () => {
    it('should return the correct select statement', () => {
      let caseObject = {
        type: 'expression',
        alias: 'age_range',
        expressionType: 'case_statement',
        caseOptions: [{
            condition: 'p.age beween 1 and 9',
            value: '1_to_9'
          },
          {
            condition: 'p.age beween 11 and 14',
            value: '11_to_14'
          },
          {
            condition: 'else',
            value: 'older_than_24'
          }
        ]
      };
      expect(generate.generateCase(caseObject, {}).toString())
        .equalIgnoreCase(`CASE WHEN (p.age beween 11 and 14) THEN '11_to_14' WHEN (p.age beween 1 and 9) THEN '1_to_9' ELSE 'older_than_24' END`)
    });
  });
});

describe('Generate Where Specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);
  });
  describe('Should return where clause when generateWhere() is called with a filters json object', () => {
    let select = Squel.select();
    //TODO add case for expression
    let filters = {
      conditionJoinOperator: "and",
      conditions: [{
        filterType: "tableColumns",
        conditionExpession: "endDate = ?",
        parameterName: 'endDate'
      }]
    };
    it('should return the correct select statement', () => {
      expect(generate.generateWhere(filters, {
          endDate: '2017-10-10'
        }).select.toString())
        .equalIgnoreCase(`SELECT where (endDate = '2017-10-10')`)
    });
  });
});

describe('Generate Group by Specs', () => {
  describe('Should return group by clause when generateGroupBy() is called', () => {
    beforeEach(() => {
      let select = Squel.select();
      generate = new SqlGenerators(select);
    });
    let groupBy = {
      groupParam: "groupByParam",
      columns: ["gender", "age"]
    };
    it('should return the correct group by statement', () => {
      expect(generate.generateGroupBy(groupBy, {}).select.toString())
        .equalIgnoreCase(`SELECT group by gender, age`)
    });

    it('It should ignore the report group columns if they are provided in the group params', () => {
      expect(generate.generateGroupBy(groupBy, {
          groupByParam: ['age']
        }).select.toString())
        .equalIgnoreCase(`SELECT group by age`)
    });
  });
});

describe('Order by Specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);
  });
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
      expect(generate.generateOrderBy(orderBy, {}).select.toString())
        .equalIgnoreCase(`SELECT order by gender asc, age desc`)
    });

    it('It should ignore the report order columns if they are provided in the order by params', () => {
      let select = Squel.select();
      expect(generate.generateOrderBy(orderBy, {
          orderByParam: [{
            column: "age",
            order: "asc"
          }]
        }).select.toString())
        .equalIgnoreCase(`SELECT order by age asc`)
    });
  });
});

describe('Paging by Specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);
  });
  describe('Should paginate generatePaging() is called ', () => {
    it('should not set paging if paging is not defined', () => {
      let select = Squel.select();
      expect(generate.generatePaging(null, {}).select.toString())
        .equalIgnoreSpaces(`SELECT`)
    });

    it('It should add paging if paging is provided in the report', () => {
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      let select = Squel.select();
      expect(generate.generatePaging(paging, {
          limitParam: 10,
          offSetParam: 0
        }).select.toString())
        .equalIgnoreCase(`SELECT limit 10 offset 0`)
    });

    it('It should ignore the limit if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      expect(generate.generatePaging(paging, {
          offSetParam: 0
        }).select.toString())
        .equalIgnoreCase(`SELECT offset 0`)
    });

    it('It should ignore the offset if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: "offSetParam",
        limitParam: "limitParam"
      };
      expect(generate.generatePaging(paging, {
          limitParam: 10
        }).select.toString())
        .equalIgnoreCase(`SELECT limit 10`)
    });

  });





});


describe('Datasources specs', () => {

  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);
  });
  it('It Should generate the correct query with the defined joins when generateDataSources() is called', () => {
    let dataSources = [{
        table: "etl.hiv_monthly_summary",
        alias: "hms"
      },
      {
        table: "amrs.patient",
        alias: "p",
        join: {
          type: "inner",
          joinCondition: "p.patient_id = hms.patient_id and p.voided is null"
        }
      },
      {
        table: "amrs.patient",
        alias: "p2",
        join: {
          type: "right",
          joinCondition: "p2.patient_id = hms.patient_id and p.voided is null"
        }
      }
    ];
    let select = Squel.select();

    expect(generate.generateDataSources(dataSources).select.toString())
      .equalIgnoreCase('SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN amrs.patient `p` ON (p.patient_id = hms.patient_id and p.voided is null) RIGHT JOIN amrs.patient `p2` ON (p2.patient_id = hms.patient_id and p.voided is null)')
  });

  it('It Should generate the correct query with the defined joins when generateDataSources() is called with  datasets', () => {
    let dataSources = [{
        table: "etl.hiv_monthly_summary",
        alias: "hms"
      },
      {
        dataSet: "enrolledDataSet",
        alias: "p",
        join: {
          type: "inner",
          joinCondition: "p.patient_id = hms.patient_id and p.voided is null"
        }
      }
    ];
    let dataSets = {
      enrolledDataSet: {
        sources: [{
          table: "etl.hiv_monthly_summary",
          alias: "e"
        }],
        filters: {
          conditionJoinOperator: "and",
          conditions: [{
            filterType: "tableColumns",
            conditionExpession: "endDate = ?",
            parameterName: 'endDate'
          }]
        }
      }
    }
    let params = {
      endDate: "2017-10-10"
    };
    let select = Squel.select();

    expect(generate.generateDataSources(dataSources, dataSets, params).select.toString())
      .equalIgnoreCase("SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN (SELECT * FROM etl.hiv_monthly_summary `e` WHERE (endDate = '2017-10-10')) `p` ON (p.patient_id = hms.patient_id and p.voided is null)")
  });
});

describe('SQL to Json specs', () => {
  beforeEach(() => {
    let select = Squel.select();
    generate = new SqlGenerators(select);
  });

  it('I should return the correct sql when the functions are chained together', () => {
    let dataSources = [{
        table: "etl.hiv_monthly_summary",
        alias: "hms"
      },
      {
        table: "amrs.patient",
        alias: "p",
        join: {
          type: "inner",
          joinCondition: "p.patient_id = hms.patient_id and p.voided is null"
        }
      }
    ];

    let paging = {
      offSetParam: "offSetParam",
      limitParam: "limitParam",
    };
    let params = {
      endDate: "2017-10-10",
      orderByParam: [{
        column: "age",
        order: "asc"
      }],
      limitParam: 10,
      offSetParam: 0,
      groupByParam: ['age']
    };

    let baseSchema = {
      columns: [{
        type: 'column',
        alias: '',
        dataSetColumn: "*"
      }],
      sources: [{
          table: "etl.hiv_monthly_summary",
          alias: "hms"
        },
        {
          table: "amrs.patient",
          alias: "p",
          join: {
            type: "inner",
            joinCondition: "p.patient_id = hms.patient_id and p.voided is null"
          }
        },
        {
          dataSet: "enrolledDataSet",
          alias: "e",
          join: {
            type: "inner",
            joinCondition: "e.patient_id = hms.patient_id and e.voided is null"
          }
        }
      ],
      groupBy: {
        groupParam: "groupByParam",
        columns: ["gender", "age"]
      },
      orderBy: {
        orderByParam: "orderByParam",
        columns: [{
          column: "gender",
          order: "asc"
        }, {
          column: "age",
          order: "desc"
        }]
      },
      paging: {
        offSetParam: "offSetParam",
        limitParam: "limitParam",
      }
    };

    let dataSets = {
      enrolledDataSet: {
        sources: [{
          table: "etl.hiv_monthly_summary",
          alias: "e"
        }, {
          dataSet: "otherTest",
          alias: "o",
          join: {
            type: "left",
            joinCondition: "e.patient_id = hms.patient_id and e.voided is null"
          }
        }],
        filters: {
          conditionJoinOperator: "and",
          conditions: [{
            filterType: "tableColumns",
            conditionExpession: "endDate = ?",
            parameterName: 'endDate'
          }]
        }
      },
      otherTest: {
        sources: [{
          table: "etl.hiv_monthly_summary",
          alias: "e"
        }],
        filters: {
          conditionJoinOperator: "and",
          conditions: [{
            filterType: "tableColumns",
            conditionExpession: "endDate = ?",
            parameterName: 'endDate'
          }]
        }
      }
    }

    let json2sql = new Json2Sql(baseSchema, dataSets, params);
    let full = json2sql.generateSQL().toString();
    expect(full)
      .equalIgnoreCase("SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN amrs.patient `p` ON (p.patient_id = hms.patient_id and p.voided is null) INNER JOIN (SELECT * FROM etl.hiv_monthly_summary `e` LEFT JOIN (SELECT * FROM etl.hiv_monthly_summary `e` WHERE (endDate = '2017-10-10')) `o` ON (e.patient_id = hms.patient_id and e.voided is null) WHERE (endDate = '2017-10-10')) `e` ON (e.patient_id = hms.patient_id and e.voided is null) GROUP BY age ORDER BY age ASC LIMIT 10 OFFSET 0")
  });

});
