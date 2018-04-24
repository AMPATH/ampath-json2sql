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

describe('Generate Select Specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();

  });
  describe('Should return columns when generateColumns() is called with a columns json object', () => {
    it('should use whitelisted columns when the whitelist columns param is provided', () => {
      let columns = [{
        type: 'simple_column',
        alias: 'age',
        column: 'p.age'
      },
      {
        type: 'simple_column',
        alias: 'gender',
        column: 'p.gender'
      }
      ];

      expect(generate.generateColumns(columns, {columnWhitelist: ['gender']}).select.toString())
        .equalIgnoreCase('SELECT p.gender AS `gender`');
    });
    it('should return the correct select statement', () => {
      let columns = [{
        type: 'simple_column',
        alias: 'age',
        column: 'p.age'
      }, {
        type: 'derived_column',
        alias: 'age_range',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'case when age between 0 and 1 then \'0_to_1\'  else \'older_than_24\'  end'
        }
      },
      {
        type: 'derived_column',
        alias: 'age_range2',
        expressionType: 'case_statement',
        expressionOptions: {
          caseOptions: [{
            condition: 'p.age between 1 and 9',
            value: '1_to_9'
          },
          {
            condition: 'p.age between 11 and 14',
            value: '11_to_14'
          },
          {
            condition: 'else',
            value: 'older_than_24'
          }
          ]
        }
      }
      ];

      expect(generate.generateColumns(columns).select.toString())
        .equalIgnoreCase('SELECT p.age AS `age`, case when age between 0 and 1 then \'0_to_1\'  else \'older_than_24\'  end AS `age_range`, CASE WHEN (p.age between 11 and 14) THEN \'11_to_14\' WHEN (p.age between 1 and 9) THEN \'1_to_9\' ELSE \'older_than_24\' END AS `age_range2`');
    });
    it('should replace placeholder params with actual params in expressions', () => {
      let columns = [{
        type: 'derived_column',
        alias: 'age_range',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'if(test=0 and date(start_date) between \'{startDate}\' and \'{endDate}\',person_id,null)'
        }
      }
      ];

      expect(generate.generateColumns(columns, {startDate: 'start', endDate: 'end'}).select.toString())
        .equalIgnoreCase('SELECT if(test=0 and date(start_date) between \'start\' and \'end\',person_id,null) AS `age_range`');
    });
    it('should return the correct select statement with index directives', () => {
      let indexDirectives = [{
        type: 'use',
        indexList: ['index1', 'index2'],
        for: 'join'
      },
      {
        type: 'force',
        indexList: ['index3', 'index4']
      },
      {
        type: 'ignore',
        indexList: ['index3', 'index4'],
        for: ''
      }
      ];

      expect(generate.addIndexDirectives(indexDirectives).select.toString())
        .equalIgnoreCase('SELECT USE INDEX FOR JOIN (index1,index2) , FORCE INDEX  (index3,index4) , IGNORE INDEX  (index3,index4)');
    });
  });
});

describe('Case Statement Specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();

  });
  describe('The correct query when when generateCase() is called with a case statement object', () => {
    it('should return the correct select statement', () => {
      let caseObject = {
        type: 'derived_column',
        alias: 'age_range',
        expressionType: 'case_statement',
        expressionOptions: {
          caseOptions: [{
            condition: 'p.age between 1 and 9',
            value: '1_to_9'
          },
          {
            condition: 'p.age between 11 and 14',
            value: '11_to_14'
          },
          {
            condition: 'else',
            value: 'older_than_24'
          }
          ]
        }
      };

      expect(generate.generateCase(caseObject, {}).toString())
        .equalIgnoreCase('CASE WHEN (p.age between 11 and 14) THEN \'11_to_14\' WHEN (p.age between 1 and 9) THEN \'1_to_9\' ELSE \'older_than_24\' END');
    });
  });
});

describe('Generate Where Specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();
  });
  describe('Should return where clause when generateWhere() is called with a filters json object', () => {
    let select = Squel.select();
    // TODO add case for expression
    let filters = {
      conditionJoinOperator: 'and',
      conditions: [{
        filterType: 'tableColumns',
        conditionExpression: 'endDate = ?',
        parameterName: 'endDate'
      }]
    };

    it('should return the correct select statement', () => {
      expect(generate.generateWhere(filters, {
        endDate: '2017-10-10'

      }).select.toString())
        .equalIgnoreCase('SELECT where (endDate = \'2017-10-10\')');
    });

    it('should Skip a filter if a params is not supplied', () => {
      expect(generate.generateWhere(filters, {}).select.toString())
        .equalIgnoreCase('SELECT');
    });

    let filters2 = {
      conditionJoinOperator: 'and',
      conditions: [{
        filterType: 'tableColumns',
        conditionExpression: '1 = (if(hiv_exposed_occupational=0 and date(pep_start_date) between \'{startDate}\' and \'{endDate}\',pep.person_id,null))',
        parameterName: ''
      }]
    };

    it('should inject params into where clause', () => {
      expect(generate.generateWhere(filters2, {
        endDate: '2017-10-10',
        startDate: '2017-10-10'
      }).select.toString())
        .equalIgnoreCase('SELECT WHERE (1 = (if(hiv_exposed_occupational=0 and date(pep_start_date) between \'2017-10-10\' and \'2017-10-10\',pep.person_id,null)))');
    });

  });
});

describe('Generate Group by Specs', () => {
  describe('Should return group by clause when generateGroupBy() is called', () => {
    beforeEach(() => {
      generate = new SqlGenerators();
    });
    let groupBy = {
      override: true,
      groupParam: 'groupByParam',
      columns: ['gender', 'age']
    };

    it('should return the correct group by statement', () => {
      expect(generate.generateGroupBy(groupBy, {}).select.toString())
        .equalIgnoreCase('SELECT group by gender, age');
    });

    it('It should ignore the report group columns if they are provided in the group params and override is true', () => {
      expect(generate.generateGroupBy(groupBy, {
        groupByParam: ['age']
      }).select.toString())
        .equalIgnoreCase('SELECT group by age');
    });

    let groupBy2 = {
      override: false,
      groupParam: 'groupByParam',
      columns: ['gender', 'age']
    };

    it('It should combine the report group columns with param columns if override is false', () => {
      expect(generate.generateGroupBy(groupBy2, {
        groupByParam: ['age']
      }).select.toString())
        .equalIgnoreCase('SELECT group by gender, age');
    });

    let groupBy3 = {
      override: false,
      groupParam: 'groupByParam',
      columns: ['gender', 'age'],
      excludeParam: 'excludeParam'
    };

    it('It should should exculed colums defined in the exclude array of the groupBy', () => {
      expect(generate.generateGroupBy(groupBy3, {
        excludeParam: ['age']
      }).select.toString())
        .equalIgnoreCase('SELECT group by gender');
    });
  });
});

describe('Order by Specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();
  });
  describe('Should return order clause when generateOrderBy() is called ', () => {
    let orderBy = {
      orderByParam: 'orderByParam',
      columns: [{
        column: 'gender',
        order: 'asc'
      }, {
        column: 'age',
        order: 'desc'
      }]
    };

    it('should return the correct order by statement', () => {
      let select = Squel.select();

      expect(generate.generateOrderBy(orderBy, {}).select.toString())
        .equalIgnoreCase('SELECT order by gender asc, age desc');
    });

    it('It should ignore the report order columns if they are provided in the order by params', () => {
      let select = Squel.select();

      expect(generate.generateOrderBy(orderBy, {
        orderByParam: [{
          column: 'age',
          order: 'asc'
        }]
      }).select.toString())
        .equalIgnoreCase('SELECT order by age asc');
    });
  });
});

describe('Paging by Specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();
  });
  describe('Should paginate generatePaging() is called ', () => {
    it('should not set paging if paging is not defined', () => {
      let select = Squel.select();

      expect(generate.generatePaging(null, {}).select.toString())
        .equalIgnoreSpaces('SELECT');
    });

    it('It should add paging if paging is provided in the report', () => {
      let paging = {
        offSetParam: 'offSetParam',
        limitParam: 'limitParam'
      };
      let select = Squel.select();

      expect(generate.generatePaging(paging, {
        limitParam: 10,
        offSetParam: 0
      }).select.toString())
        .equalIgnoreCase('SELECT limit 10 offset 0');
    });

    it('It should ignore the limit if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: 'offSetParam',
        limitParam: 'limitParam'
      };

      expect(generate.generatePaging(paging, {
        offSetParam: 0
      }).select.toString())
        .equalIgnoreCase('SELECT offset 0');
    });

    it('It should ignore the offset if it can not find the param', () => {
      let select = Squel.select();
      let paging = {
        offSetParam: 'offSetParam',
        limitParam: 'limitParam'
      };

      expect(generate.generatePaging(paging, {
        limitParam: 10
      }).select.toString())
        .equalIgnoreCase('SELECT limit 10');
    });

  });

});

describe('Datasources specs', () => {

  beforeEach(() => {
    generate = new SqlGenerators();
  });
  it('It Should generate the correct query with the defined joins when generateDataSources() is called', () => {
    let dataSources = [{
      table: 'etl.hiv_monthly_summary',
      alias: 'hms'
    },
    {
      table: 'amrs.patient',
      alias: 'p',
      join: {
        type: 'inner',
        joinCondition: 'p.patient_id = hms.patient_id and p.voided is null'
      }
    },
    {
      table: 'amrs.patient',
      alias: 'p2',
      join: {
        type: 'right',
        joinCondition: 'p2.patient_id = hms.patient_id and p.voided is null'
      }
    }
    ];
    let select = Squel.select();

    expect(generate.generateDataSources(dataSources).select.toString())
      .equalIgnoreCase('SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN amrs.patient `p` ON (p.patient_id = hms.patient_id and p.voided is null) RIGHT JOIN amrs.patient `p2` ON (p2.patient_id = hms.patient_id and p.voided is null)');
  });

  it('It Should generate the correct query with the defined joins when generateDataSources() is called with  datasets', () => {
    let dataSources = [{
      table: 'etl.hiv_monthly_summary',
      alias: 'hms'
    },
    {
      dataSet: 'enrolledDataSet',
      alias: 'p',
      join: {
        type: 'inner',
        joinCondition: 'p.patient_id = hms.patient_id and p.voided is null'
      }
    }
    ];
    let dataSets = {
      enrolledDataSet: {
        sources: [{
          table: 'etl.hiv_monthly_summary',
          alias: 'e'
        }],
        filters: {
          conditionJoinOperator: 'and',
          conditions: [{
            filterType: 'tableColumns',
            conditionExpression: 'endDate = ?',
            parameterName: 'endDate'
          }]
        }
      }
    };
    let params = {
      endDate: '2017-10-10'
    };
    let select = Squel.select();

    expect(generate.generateDataSources(dataSources, dataSets, params).select.toString())
      .equalIgnoreCase("SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN (SELECT * FROM etl.hiv_monthly_summary `e` WHERE (endDate = '2017-10-10')) `p` ON (p.patient_id = hms.patient_id and p.voided is null)");
  });

  it('It Should generate the correct query with the defined joins when generateDataSources() is called with  datasets', () => {
    let dataSources = [{
      table: 'etl.hiv_monthly_summary',
      alias: 'hms'
    },
    {
      dataSet: 'enrolledDataSet',
      alias: 'p',
      join: {
        type: 'inner',
        joinCondition: 'p.patient_id = hms.patient_id and p.voided is null'
      },
      forwardedParams: [{
        'mapping': 'endDate:eDate'
      }]
    }
    ];
    let dataSets = {
      enrolledDataSet: {
        sources: [{
          table: 'etl.hiv_monthly_summary',
          alias: 'e'
        }],
        filters: {
          conditionJoinOperator: 'and',
          conditions: [{
            filterType: 'tableColumns',
            conditionExpression: 'endDate = ?',
            parameterName: 'eDate'
          }]
        }
      }
    };
    let params = {
      endDate: '2017-10-10'
    };
    let select = Squel.select();

    expect(generate.generateDataSources(dataSources, dataSets, params).select.toString())
      .equalIgnoreCase("SELECT * FROM etl.hiv_monthly_summary `hms` INNER JOIN (SELECT * FROM etl.hiv_monthly_summary `e` WHERE (endDate = '2017-10-10')) `p` ON (p.patient_id = hms.patient_id and p.voided is null)");
  });
});

describe('SQL to Json specs', () => {
  beforeEach(() => {
    generate = new SqlGenerators();
  });

  it('I should return the correct sql when the functions are chained together', () => {
    let dataSources = [{
      table: 'etl.hiv_monthly_summary',
      alias: 'hms'
    },
    {
      table: 'amrs.patient',
      alias: 'p',
      join: {
        type: 'inner',
        joinCondition: 'p.patient_id = hms.patient_id and p.voided is null'
      }
    }
    ];

    let paging = {
      offSetParam: 'offSetParam',
      limitParam: 'limitParam'
    };
    let params = {
      endDate: '2017-10-10',
      orderByParam: [{
        column: 'age',
        order: 'asc'
      }],
      limitParam: 10,
      offSetParam: 0,
      groupByParam: ['age']
    };

    let indexDirectives = [{
      type: 'use',
      indexList: ['index1', 'index2'],
      for: 'join'
    },
    {
      type: 'force',
      indexList: ['index3', 'index4']
    }
    ];

    let baseSchema = {
      indexDirectives,
      columns: [{
        type: 'simple_column',
        alias: '',
        column: '*'
      }],
      sources: [{
        table: 'etl.hiv_monthly_summary',
        alias: 'hms'
      },
      {
        table: 'amrs.patient',
        alias: 'p',
        join: {
          type: 'inner',
          joinCondition: 'p.patient_id = hms.patient_id and p.voided is null'
        }
      },
      {
        dataSet: 'enrolledDataSet',
        alias: 'e',
        join: {
          type: 'inner',
          joinCondition: 'e.patient_id = hms.patient_id and e.voided is null'
        }
      }
      ],
      groupBy: {
        groupParam: 'groupByParam',
        override: true,
        columns: ['gender', 'age']
      },
      orderBy: {
        orderByParam: 'orderByParam',
        columns: [{
          column: 'gender',
          order: 'asc'
        }, {
          column: 'age',
          order: 'desc'
        }]
      },
      paging: {
        offSetParam: 'offSetParam',
        limitParam: 'limitParam'
      }
    };

    let dataSets = {
      enrolledDataSet: {
        sources: [{
          table: 'etl.hiv_monthly_summary',
          alias: 'e'
        }, {
          dataSet: 'otherTest',
          alias: 'o',
          join: {
            type: 'left',
            joinCondition: 'e.patient_id = hms.patient_id and e.voided is null'
          }
        }],
        filters: {
          conditionJoinOperator: 'and',
          conditions: [{
            filterType: 'tableColumns',
            conditionExpression: 'endDate = ?',
            parameterName: 'endDate'
          }]
        }
      },
      otherTest: {
        sources: [{
          table: 'etl.hiv_monthly_summary',
          alias: 'e'
        }],
        filters: {
          conditionJoinOperator: 'and',
          conditions: [{
            filterType: 'tableColumns',
            conditionExpression: 'endDate = ?',
            parameterName: 'endDate'
          }]
        }
      }
    };

    let json2sql = new Json2Sql(baseSchema, dataSets, params);
    let full = json2sql.generateSQL().toString();

    expect(full)
      .equalIgnoreCase("SELECT * FROM etl.hiv_monthly_summary `hms` USE INDEX FOR JOIN (index1,index2) , FORCE INDEX  (index3,index4) INNER JOIN amrs.patient `p` ON (p.patient_id = hms.patient_id and p.voided is null) INNER JOIN (SELECT * FROM etl.hiv_monthly_summary `e` LEFT JOIN (SELECT * FROM etl.hiv_monthly_summary `e` WHERE (endDate = '2017-10-10')) `o` ON (e.patient_id = hms.patient_id and e.voided is null) WHERE (endDate = '2017-10-10')) `e` ON (e.patient_id = hms.patient_id and e.voided is null) GROUP BY age ORDER BY age ASC LIMIT 10 OFFSET 0");
  });

  describe('MOH 731 green card tests', () => {
    beforeEach(() => {
      generate = new SqlGenerators();
    });

    let mainSchema = {
      columns: [{
        type: 'simple_column',
        alias: 'gender',
        column: 'hmsd.gender'
      },
      {
        type: 'simple_column',
        alias: 'age_range',
        column: 'hmsd.age_range'
      },
      {
        type: 'derived_column',
        alias: 'enrolled_this_month',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.enrolled_this_month)'
        }
      },
      {
        type: 'derived_column',
        alias: 'pre_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.pre_art)'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.started_art)'
        }
      },
      {
        type: 'derived_column',
        alias: 'current_in_care',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.current_in_care)'
        }
      },
      {
        type: 'derived_column',
        alias: 'active_on_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.active_on_art)'
        }
      },
      {
        type: 'derived_column',
        alias: 'on_ctx_prophylaxis',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'count(hmsd.on_ctx_prophylaxis)'
        }
      },
      {
        type: 'derived_column',
        alias: 'screened_for_tb',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.screened_for_tb)'
        }
      },
      {
        type: 'derived_column',
        alias: 'tb_screened_positive',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.tb_screened_positive)'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_ipt',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.started_ipt)'
        }
      },
      {
        type: 'derived_column',
        alias: 'completed_ipt_past_12_months',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.completed_ipt_past_12_months)'
        }
      },
      {
        type: 'derived_column',
        alias: 'condoms_provided',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.condoms_provided)'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_modern_contraception',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.condoms_provided)'
        }
      },
      {
        type: 'derived_column',
        alias: 'on_modern_contraception',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.on_modern_contraception)'
        }
      },
      {
        type: 'derived_column',
        alias: 'f_gte_18_visits',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'sum(hmsd.f_gte_18_visits)'
        }
      }
      ],
      sources: [{
        dataSet: 'baseSchema',
        alias: 'hmsd'
      }],
      groupBy: {
        groupParam: 'groupByParam',
        columns: ['gender', 'age_range']
      }
    };

    let baseSchema = {
      columns: [{
        type: 'simple_column',
        alias: 'gender',
        column: 'hmsd.gender'
      },
      {
        type: 'derived_column',
        alias: 'age_range',
        expressionType: 'case_statement',
        expressionOptions: {
          caseOptions: [{
            condition: 'hmsd.age < 1',
            value: '0_to_1'
          },
          {
            condition: 'hmsd.age between 1 and 9',
            value: '1_to_9'
          },
          {
            condition: 'hmsd.age between 10 and 14',
            value: '10_to_14'
          },
          {
            condition: 'hmsd.age between 15 and 19',
            value: '15_to_19'
          },
          {
            condition: 'hmsd.age between 20 and 24',
            value: '20_to_24'
          },
          {
            condition: 'else',
            value: 'older_than_24'
          }
          ]
        }
      },
      {
        type: 'derived_column',
        alias: 'enrolled_this_month',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'case when enrolled_this_month=1 then 1 else null end'
        }
      },
      {
        type: 'derived_column',
        alias: 'pre_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'if(arv_first_regimen is null and status=\'active\',1,null)'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'if(started_art_this_month=1  AND location_id = arv_first_regimen_location_id,1,null)'
        }
      },
      {
        type: 'derived_column',
        alias: 'current_in_care',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'case when status=\'active\' then 1 else null end'
        }
      },
      {
        type: 'derived_column',
        alias: 'active_on_art',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'case when status=\'active\' and on_art_this_month=1 then 1 else null end'
        }
      },
      {
        type: 'derived_column',
        alias: 'on_ctx_prophylaxis',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'case when status=\'active\' and on_pcp_prophylaxis_this_month=1 then 1 else null end'
        }
      },
      {
        type: 'derived_column',
        alias: 'screened_for_tb',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'tb_screened_since_active'
        }
      },
      {
        type: 'derived_column',
        alias: 'tb_screened_positive',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'tb_screened_positive_this_month'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_ipt',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'started_ipt_this_month'
        }
      },
      {
        type: 'derived_column',
        alias: 'completed_ipt_past_12_months',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'completed_ipt_past_12_months'
        }
      },
      {
        type: 'derived_column',
        alias: 'condoms_provided',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'condoms_provided_this_month'
        }
      },
      {
        type: 'derived_column',
        alias: 'started_modern_contraception',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'started_modern_contraception_this_month'
        }
      },
      {
        type: 'derived_column',
        alias: 'on_modern_contraception',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'if(gender=\'F\' and age>=15 and modern_contraception_since_active=1,1,0)'
        }
      },
      {
        type: 'derived_column',
        alias: 'f_gte_18_visits',
        expressionType: 'simple_expression',
        expressionOptions: {
          expression: 'if(gender=\'F\' and age >= 18 and visit_this_month=1,1,0)'
        }
      }
      ],
      sources: [{
        table: 'etl.hiv_monthly_report_dataset',
        alias: 'hmsd'
      }],
      filters: {
        conditionJoinOperator: 'and',
        conditions: [{
          filterType: 'tableColumns',
          conditionExpression: 'endDate = ?',
          parameterName: 'endDate'
        }]
      }
    };

    it('should generate the correct moh731 queries given the schemas', () => {
      let json2sql = new Json2Sql(mainSchema, {
        baseSchema
      }, {
        endDate: '2017-11-30'
      });
      let base = json2sql.generateSQL().toString();
      let baseSchem = {
        'name': 'retentionDataSetbase',
        'version': '1.0',
        'tag': '',
        'description': '',
        'uses': [],
        'sources': [
          {
            'table': 'etl.hiv_monthly_report_dataset',
            'alias': 'hmsd'
          },
          {
            'table': 'amrs.person',
            'alias': 't1',
            'join': {
              'type': 'INNER',
              'joinCondition': 'hmsd.person_id = t1.person_id'
            }
          },
          {
            'table': 'amrs.person_name',
            'alias': 'person_name',
            'join': {
              'type': 'INNER',
              'joinCondition': 't1.person_id = person_name.person_id AND (person_name.voided IS NULL || person_name.voided = 0)'
            }
          },
          {
            'table': 'amrs.patient_identifier',
            'alias': 'id',
            'join': {
              'type': 'LEFT OUTER',
              'joinCondition': 't1.person_id = person_name.person_id AND (person_name.voided IS NULL || person_name.voided = 0)'
            }
          }
        ],
        'columns': [
          {
            'type': 'simple_column',
            'alias': 'location_id',
            'column': 'hmsd.location_id'
          },
          {
            'type': 'simple_column',
            'alias': 'person_id',
            'column': 'hmsd.person_id'
          },
          {
            'alias': 'net_cohort',
            'expressionOptions': {
              'expression': '1'
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'active',
            'expressionOptions': {
              'expression': "if(status='active',1,null)"
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'ltfu',
            'expressionOptions': {
              'expression': "if(status='ltfu',1,null)"
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'dead',
            'expressionOptions': {
              'expression': "if(status='dead',1,null)"
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'on_tx',
            'expressionOptions': {
              'expression': 'if(on_art_this_month=1,1,null)'
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'suppressed',
            'expressionOptions': {
              'expression': 'if(vl_1<1000 and vl_in_past_year=1,1,null)'
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'alias': 'total_with_vl',
            'expressionOptions': {
              'expression': 'if(vl_in_past_year=1,1,null)'
            },
            'type': 'derived_column',
            'expressionType': 'simple_expression'
          },
          {
            'type': 'derived_column',
            'alias': 'person_name',
            'expressionType': 'simple_expression',
            'expressionOptions': {
              'expression': " CONCAT(COALESCE(person_name.given_name, ''), ' ', COALESCE(person_name.middle_name, ''), ' ', COALESCE(person_name.family_name, ''))"
            }
          },
          {
            'type': 'derived_column',
            'alias': 'person_identifiers',
            'expressionType': 'simple_expression',
            'expressionOptions': {
              'expression': " GROUP_CONCAT(DISTINCT id.identifier SEPARATOR ', ')"
            }
          }
        ],
        'filters': {
          'conditionJoinOperator': 'and',
          'conditions': [
            {
              'filterType': 'tableColumns',
              'conditionExpression': 'endDate = ?',
              'parameterName': 'endDate'
            },
            {
              'filterType': 'tableColumns',
              'conditionExpression': "status in ('active','ltfu','dead')",
              'parameterName': ''
            },
            {
              'filterType': 'tableColumns',
              'conditionExpression': "arv_first_regimen_start_date between date_format(date_sub(endDate,interval 1 year),'%Y-%m-01') and date_sub(endDate,interval 1 year)",
              'parameterName': ''
            },
            {
              'filterActingOn': 'derived_column',
              'conditionExpression': "1 = (if(status='active',1,null))",
              'dynamicallyGenerated': true,
              'filterType': 'tableColumns',
              'parameterName': ''
            }
          ]
        },

        'paging': {
          'offSetParam': 'offSetParam',
          'limitParam': 'limitParam'
        },
        'groupBy': {
          'columns': [
            't1.person_id'
          ]
        }
      };
      let json2sql2 = new Json2Sql(baseSchem, {
        baseSchem
      }, {
        endDate: '2017-11-30'
      });
      let r = json2sql2.generateSQL().toString();

      mlog.log(r);

      expect(base)
        .equalIgnoreCase("SELECT hmsd.gender AS `gender`, hmsd.age_range AS `age_range`, count(hmsd.enrolled_this_month) AS `enrolled_this_month`, count(hmsd.pre_art) AS `pre_art`, count(hmsd.started_art) AS `started_art`, count(hmsd.current_in_care) AS `current_in_care`, count(hmsd.active_on_art) AS `active_on_art`, count(hmsd.on_ctx_prophylaxis) AS `on_ctx_prophylaxis`, sum(hmsd.screened_for_tb) AS `screened_for_tb`, sum(hmsd.tb_screened_positive) AS `tb_screened_positive`, sum(hmsd.started_ipt) AS `started_ipt`, sum(hmsd.completed_ipt_past_12_months) AS `completed_ipt_past_12_months`, sum(hmsd.condoms_provided) AS `condoms_provided`, sum(hmsd.condoms_provided) AS `started_modern_contraception`, sum(hmsd.on_modern_contraception) AS `on_modern_contraception`, sum(hmsd.f_gte_18_visits) AS `f_gte_18_visits` FROM (SELECT hmsd.gender AS `gender`, CASE WHEN (hmsd.age between 20 and 24) THEN '20_to_24' WHEN (hmsd.age between 15 and 19) THEN '15_to_19' WHEN (hmsd.age between 10 and 14) THEN '10_to_14' WHEN (hmsd.age between 1 and 9) THEN '1_to_9' WHEN (hmsd.age < 1) THEN '0_to_1' ELSE 'older_than_24' END AS `age_range`, case when enrolled_this_month=1 then 1 else null end AS `enrolled_this_month`, if(arv_first_regimen is null and status='active',1,null) AS `pre_art`, if(started_art_this_month=1  AND location_id = arv_first_regimen_location_id,1,null) AS `started_art`, case when status='active' then 1 else null end AS `current_in_care`, case when status='active' and on_art_this_month=1 then 1 else null end AS `active_on_art`, case when status='active' and on_pcp_prophylaxis_this_month=1 then 1 else null end AS `on_ctx_prophylaxis`, tb_screened_since_active AS `screened_for_tb`, tb_screened_positive_this_month AS `tb_screened_positive`, started_ipt_this_month AS `started_ipt`, completed_ipt_past_12_months AS `completed_ipt_past_12_months`, condoms_provided_this_month AS `condoms_provided`, started_modern_contraception_this_month AS `started_modern_contraception`, if(gender='F' and age>=15 and modern_contraception_since_active=1,1,0) AS `on_modern_contraception`, if(gender='F' and age >= 18 and visit_this_month=1,1,0) AS `f_gte_18_visits` FROM etl.hiv_monthly_report_dataset `hmsd` WHERE (endDate = '2017-11-30')) `hmsd` GROUP BY gender, age_range");

    });
  });

  describe('MOH 731 blue card tests', () => {
    beforeEach(() => {

      generate = new SqlGenerators();
    });

  });

});
