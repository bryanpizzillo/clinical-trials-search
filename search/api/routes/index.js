const _                   = require("lodash");
const express             = require("express");
const md                  = require("marked");
const git                 = require("git-rev");
const searcherAdapter     = require("../../common/search_adapters/elasticsearch_adapter");
const Searcher            = require("../search/searcher");
const Logger              = require('../../../common/logger');
const Utils               = require("../../../common/utils");
const trialMapping        = require("../../index/indexer/trial/mapping.json");
const package             = require("../package.json");

let logger = new Logger({name: "api-router"});

let searcher = new Searcher(searcherAdapter);

const router = express.Router();

const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(trialMapping["trial"]);

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

/* get a clinical trial by nci or nct id */
router.get('/clinical-trial/:id', (req, res, next) => {
  let id = req.params.id;
  searcher.getTrialById(id, (err, trial) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    if (!_.isEmpty(trial)) {
      res.json(trial);
    } else {
      res.sendStatus(404);
    }
  });
});

const _getInvalidTrialQueryParams = (queryParams) => {
  let without = _.without(queryParams,
    "from", "size", "sort", "_all", "_fulltext", "include", "exclude", "_trialids");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_fulltext")) {
      //This allows to handle _fulltext querying against specific fields.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["fulltext"], paramWithoutOp) ) {
        return false;
      }
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["long"], paramWithoutOp) ||
        _.includes(searchPropsByType["float"], paramWithoutOp)
      ) {
        return false;
      }
    } else if (
      queryParam.endsWith("_lon") ||
      queryParam.endsWith("_lat") ||
      queryParam.endsWith("_dist")
    ) {
      //Special endings for geo distance filtering.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["geo_point"], paramWithoutOp) ) {
        return false;
      }
    }
    return true;
  });
}

const queryClinicalTrialsAndSendResponse = (q, res, next) => {
  let queryParams = Object.keys(q);
  // validate query params...
  let invalidParams = _getInvalidTrialQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return res.status(400).send(error);
  }

  
  searcher.searchTrials(q, (err, trials) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    // TODO: format trials
    res.json(trials);
  });
}

/**
 * This is a modification of getInvalidTrialQueryParams.
 * It is almost like 
 */
const _getInvalidAggQueryParams = (queryParams) => {
  //We allow the same things as TrialQuery except for:
  // - Include/Exclude -- we will not return trial records, so it is not needed
  // - from -- we do not need a pager for the aggs, well, not yet.
  // We have added additional params:
  //  - agg_type -- one, and only one field to aggregate by.  We will use size and sort
  //    to handle the number requested and the sort order.
  //  - agg_term -- the optional text to be used to preface the term.  
  let without = _.without(queryParams,
    "agg_field", "agg_term", "size", "sort", "_all", "_fulltext", "_trialids");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_fulltext")) {
      //This allows to handle _fulltext querying against specific fields.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["fulltext"], paramWithoutOp) ) {
        return false;
      }
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["long"], paramWithoutOp) ||
        _.includes(searchPropsByType["float"], paramWithoutOp)
      ) {
        return false;
      }
    } else if (
      queryParam.endsWith("_lon") ||
      queryParam.endsWith("_lat") ||
      queryParam.endsWith("_dist")
    ) {
      //Special endings for geo distance filtering.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["geo_point"], paramWithoutOp) ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Function for handling aggregation endpoint, which is kind
 * of like a search, with some additional processing.
 */
const aggClinicalTrialsAndSendResponse = (q, res, next) => {
  let queryParams = Object.keys(q);
  // validate query params...

  // First, we require agg_type to be a valid aggregate-able field.
  // At the very least it must have a ._raw "sub-field."
  if (!q["agg_field"]) {
    let error = {
      "Error": "agg_field parameter required."      
    };
    logger.error(error);
    return res.status(400).send(error);
  } else {
    //TODO: check to see if the field is a special know field,
    //or if it has a _raw sub-field.

    //TODO: ensure that only one field has been selected.  OR, make
    // sure that if agg_term is used then there are not multiple
    // aggregation fields
  }

  // Now see if it is a valid aggregate field for autosuggest
  // filtering.
  if (q["agg_term"]) {
    //TODO: check to see if the agg_field has a _auto sub-field. 
  }

  let invalidParams = _getInvalidAggQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return res.status(400).send(error);
  }  


  searcher.aggTrials(q, (err, agg_res) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    // TODO: format trials
    res.json(agg_res);
  });
}

/* get clinical trials that match supplied search criteria */
router.get('/clinical-trials', (req, res, next) => {
  let q = req.query;
  queryClinicalTrialsAndSendResponse(q, res, next);
});

router.post('/clinical-trials', (req, res, next) => {
  let q = req.body;
  queryClinicalTrialsAndSendResponse(q, res, next);
});


/* get aggregates for a field that match supplied 
   search criteria 
*/
router.get('/trial-aggregates', (req, res, next) => {
  let q = req.query;
  aggClinicalTrialsAndSendResponse(q, res, next);
});

router.post('/trial-aggregates', (req, res, next) => {
  let q = req.body;
  aggClinicalTrialsAndSendResponse(q, res, next);
});


/* get key terms that can be used to search through clinical trials */
router.get('/terms', (req, res, next) => {
  let q = _.pick(req.query, ["term", "term_type", "size", "from", "codes"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

router.post('/terms', (req, res, next) => {
  let q = _.pick(req.body, ["term", "term_type", "size", "from", "codes"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

/* get a term by its key */
router.get('/term/:key', (req, res, next) => {
  let key = req.params.key;
  searcher.getTermByKey(key, (err, term) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(term);
  });
});


router.get('/clinical-trial.json', (req, res, next) => {
  let clinicalTrialJson = Utils.omitPrivateKeys(trialMapping);
  let excludeKeys = [
    "analyzer", "index",
    "format", "include_in_root",
    "include_in_all"
  ]
  clinicalTrialJson = Utils.omitDeepKeys(clinicalTrialJson, excludeKeys);
  res.json(clinicalTrialJson["trial"]["properties"]);
});

router.get('/', (req, res, next) => {
  let title = "NCI Clinical Trials API";
  res.render('index', { md, title });
});

router.get('/version', (req, res, next) => {
  const _sendVersionResponse = (gitHash) => {
    res.json({
      "version": package.version,
      "git-hash": gitHash,
      "git-repository": package.repository.url
    });
  };

  var gitHash;
  try {
    gitHash = require("../git_hash.json").git_hash;
    if (!gitHash) {
      throw new Error("git_hash field missing from ../git_hash.json");
    }
  } catch(err) {
    // catch error and log a warning
    logger.warning(err,
      "Missing ../git_hash.json file, attempting to use git-rev library to look up git hash..."
    );
  }

  if (gitHash) {
    _sendVersionResponse(gitHash)
  } else {
    git.long((gitHash) => {
      _sendVersionResponse(gitHash);
    });
  }
});

module.exports = router;
