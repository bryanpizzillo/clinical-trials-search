const _                   = require("lodash");
const moment              = require("moment");
const Transform           = require("stream").Transform;
const Logger              = require("../../../common/logger");
const async               = require("async");

let logger = new Logger({ name: "add-intervention-parents-stream" });

/**
 * Adds tree terms to interventions much like how the diseases have 
 * tree terms.  This will allow upcoding of interventions so that
 * we may find them by Drug Family OR Drug Name.  This will also
 * apply to things like searching for surgery and finding radiotherapy
 *
 * @class AddInterventionParentsStream
 * @extends {Transform}
 */
class AddInterventionParentsStream extends Transform {

  constructor(thesaurus, neoplasmCore, diseaseBlacklist, thesaurusLookup) {
    super({ objectMode: true });

    this._createThesaurusLookups(thesaurus);
    this.thesaurusLookup = thesaurusLookup;
  }

  _createThesaurusLookups(thesaurus) {
    let thesaurusById = {};
    let thesaurusByName = {};
    thesaurus.forEach((row) => {
      if (row.code) {
        thesaurusById[row.code] = row;
      }
      if (row.synonyms && row.synonyms.length) {
        let name = row.synonyms.split("|")[0];
        thesaurusByName[name] = row;
      }
    });
    this.thesaurusById = thesaurusById;
    this.thesaurusByName = thesaurusByName;
  }

  /**
   * Gets all parent interventions until the root of the tree is found
   * 
   * @param {any} termID 
   * @returns 
   * 
   * @memberOf AddInterventionParentsStream
   */
  _getParentInterventions(termID) {
    let parentInterventions = [];

    let parentTerm = this.thesaurusById[termID];

    if (!parentTerm) {
      logger.error(`ERROR: Couldn't find NCIt item for intervention parent (${termID}).`);
      return parentInterventions;
    }

    //NOTE: The thesaurus lookup is only good for figuring out the parent hierarchy.
    //in its current format it does not seem to have a preferred name, just concept name
    //which is text with underscores, or the display name, which may be empty.
    //Once again, skipping EVS for speed here, but may update code to just fetch parents
    //from EVS.  Alternatives could be to augment the data in DW2 so the export contains the
    //tree codes just like disease.  
    //Will fix names in supplement for now during our vocabulary loop.
    let parentIntervention = {
      intervention_code: parentTerm.code,
      intervention_name: parentTerm.concept_name,
      inclusion_indicator: "TREE",
      intervention_type: "TREE", //UH, what should this be? could semantic type infer this type?
      //intervention_description: parentTerm.definition,
      intervention_description: '', //the definition is removed from the term lookups.  don't want to break other things by adding back in.
      parents: []
    }

    parentInterventions.push(parentIntervention);

    if (parentTerm.parents) {
      //add parents list to current intervention
      parentIntervention["parents"] = parentTerm.parents.split("|");

      if (parentTerm.parents != "root_node" ) {
        parentIntervention.parents.forEach((ancestorTermID) => {
          parentInterventions = _.unionBy(parentInterventions, this._getParentInterventions(ancestorTermID), 'intervention_code');
        });
      }
    } else {                
      parentIntervention["parents"] = ["root_node"];
    }
    
    return parentInterventions;
  }

  _addInterventionParents(trial) {
    //Loop through interventions.
    //add inclusion_indicator: trial to existing terms
    //go to all term ancestors until at root
    //using flat thesaurus for this logic    

    if (trial.arms) {
      trial.arms.forEach((arm) => {

        if (arm.interventions) {
          let additionalTerms = [];

          arm.interventions.forEach((intervention) => {            
            intervention["inclusion_indicator"] = "TRIAL";

            let term = this.thesaurusById[intervention.intervention_code];

            if (term) {
              if (term.parents) {
                //add parents list to current intervention
                intervention["parents"] = term.parents.split("|");
                
                if (term.parents != "root_node") {
                  intervention.parents.forEach((parentTermID) => {
                    additionalTerms = _.unionBy(additionalTerms, this._getParentInterventions(parentTermID), 'intervention_code');
                  });
                }
              } else {                
                intervention["parents"] = ["root_node"];
              }
            } else {
              logger.error(`ERROR: Couldn't find NCIt item for intervention (${intervention.intervention_code}).`);
              intervention["parents"] = [];
            }
          });
          //Add the arm interventions
          additionalTerms.forEach((addTerm) => {
            //I don't know if an arm would be tagged with both a child and its ancestor term,
            //but let's just make sure before adding.
            if (!_.some(arm.interventions, ['intervention_code', addTerm.intervention_code])) {
              arm.interventions.push(addTerm);
            }
          })
        }
      })
    }
  }

  _transform(trial, enc, next) {

      logger.info(`Adding Interervention tree codes for trial with nci_id (${trial.nci_id})...`);

      this._addInterventionParents(trial);

      this.push(trial);
      logger.info(`Completed Adding Interventions trial with nci_id (${trial.nci_id}).`);
      return next();
  }

}

module.exports = AddInterventionParentsStream;