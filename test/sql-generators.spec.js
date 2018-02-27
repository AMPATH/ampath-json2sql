import chai from 'chai';
import mlog from 'mocha-logger';
import * as Squel from 'squel';
chai.use(require('chai-string'));
chai.expect();
import {
  SqlGenerators
} from '../lib/ampath-json2sql';

const expect = chai.expect;
const should = chai.should;
let generate;

describe('Generate Column Specs', () => {
  before(() => {
    generate = new SqlGenerators();

  });
  describe('Should return columns when generateColumns() is called with a columns json object', () => {
    it('should return the name', () => {
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
    it('should return the name', () => {
      expect(generate.generateWhere()).contains(1)
    });
  });
});
