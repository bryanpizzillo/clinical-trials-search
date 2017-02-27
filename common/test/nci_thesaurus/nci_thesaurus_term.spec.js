import { expect } from 'chai';
const NCIThesaurusTerm      = require("../../nci_thesaurus/nci_thesaurus_term");

describe('nci thesaurus term', _ => {

    it('Should Deserialize a Drug', () => {
        let objData = require("./data/C1647_drug.json");
        let actualTerm = NCIThesaurusTerm.DeserializeFromLexEVS(objData);
        let expectedTerm = require("./data/C1647_drug_expected");

        //Deep because you need to test each synonyms members too
        expect(actualTerm.entityID).to.eql(expectedTerm.entityID);
        expect(actualTerm.preferredName).to.eql(expectedTerm.preferredName);
        expect(actualTerm.displayName).to.eql(expectedTerm.displayName);
        expect(actualTerm.synonyms).to.deep.have.members(expectedTerm.synonyms);
    });

    it('Should Filter Synonyms - Keep all using nulls', () => {
        let term = require("./data/C1647_drug_expected");
        let actualSyns = term.filterSynonyms(null, null);
        expect(actualSyns).to.deep.have.members(term.synonyms);
    });

    it('Should Filter Synonyms - Keep all using empty arrays', () => {
        let term = require("./data/C1647_drug_expected");
        let actualSyns = term.filterSynonyms([], []);
        expect(actualSyns).to.deep.have.members(term.synonyms);
    });

    it('Should Filter Synonyms - Only Match One Source (str)', () => {
        let term = require("./data/C1647_drug_expected");
        let actualSyns = term.filterSynonyms("FDA", []);
        let expectedSyn = { "source": "FDA", "sourceCode": "P188ANX8CK", "text": "TRASTUZUMAB", "type": "PT" };
        expect(actualSyns).to.deep.have.members([expectedSyn]);
    });

    it('Should Filter Synonyms - Only Match Source (one string array)', () => {
        let term = require("./data/C1647_drug_expected");
        let actualSyns = term.filterSynonyms(['FDA'], []);
        let expectedSyn = { "source": "FDA", "sourceCode": "P188ANX8CK", "text": "TRASTUZUMAB", "type": "PT" };
        expect(actualSyns).to.deep.have.members([expectedSyn]);
    });
    
});
