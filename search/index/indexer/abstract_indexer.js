const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../../common/logger");
const CONFIG              = require("../../config.json");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

class AbstractIndexer {

  get LOGGER_NAME() {
    return "abstract-indexer";
  }

  constructor(params) {
    this.logger = new Logger({name: this.LOGGER_NAME});
    this.esIndex = params.esIndex;
    this.esType = params.esType;
    this.esMapping = params.esMapping;
    this.esSettings = params.esSettings;

    let hosts = [];

    if (Array.isArray(CONFIG.ES_HOST)) {
      CONFIG.ES_HOST.forEach(host => {
        hosts.push(`${host}:${CONFIG.ES_PORT}`)
      });
    } else {
      hosts.push(`${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`);
    } 
  
    this.client = new ElasticSearch.Client({
      hosts: hosts,
      log: ElasticSearchLogger
    });
  }

  _toTitleCase(str) {
    return str.replace(/\w\S*/g,
      function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  deleteIndex(callback) {
    this.logger.info(`Deleting index (${this.esIndex}).`);
    this.client.indices.delete({
      index: this.esIndex
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  initIndex(callback) {
    this.logger.info(`Creating index (${this.esIndex}).`);
    this.client.indices.create({
      index: this.esIndex,
      body: this.esSettings
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  indexExists(callback) {
    this.client.indices.exists({
      index: this.esIndex
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  indexDocument(doc, callback) {
    this.client.index(doc, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  initMapping(callback) {
    this.logger.info(`Updating mapping for index (${this.esIndex}).`);
    return this.client.indices.putMapping({
      index: this.esIndex,
      type: this.esType,
      body: this.esMapping
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  // implement this
  static init(callback) {
    return callback();
  }

}

module.exports = AbstractIndexer;
