#!/bin/sh

set -e

date
echo 'cleaning up old DW2 dump'
psql -U ctrpdw2 -h localhost -p 5472 ctrpdw2 <<EOF
DROP TABLE IF EXISTS dw_study;
DROP TABLE IF EXISTS dw_study_arm_and_intervention;
DROP TABLE IF EXISTS dw_study_association;
DROP TABLE IF EXISTS dw_study_collaborator;
DROP TABLE IF EXISTS dw_study_disease;
DROP TABLE IF EXISTS dw_study_eligibility_criteria;
DROP TABLE IF EXISTS dw_study_grant;
DROP TABLE IF EXISTS dw_study_other_identifier;
DROP TABLE IF EXISTS dw_study_outcome_measure;
DROP TABLE IF EXISTS dw_study_participating_site;
DROP TABLE IF EXISTS dw_study_participating_site_investigators;
DROP TABLE IF EXISTS dw_study_secondary_purpose;
DROP TABLE IF EXISTS dw_study_anatomic_site;
DROP TABLE IF EXISTS dw_organization;
DROP TABLE IF EXISTS dw_study_overall_status;
DROP TABLE IF EXISTS dw_study_biomarker;
DROP TABLE IF EXISTS hist_dw_study;
DROP TABLE IF EXISTS hist_dw_study_arm_and_intervention;
DROP TABLE IF EXISTS hist_dw_study_association;
DROP TABLE IF EXISTS hist_dw_study_collaborator;
DROP TABLE IF EXISTS hist_dw_study_disease;
DROP TABLE IF EXISTS hist_dw_study_eligibility_criteria;
DROP TABLE IF EXISTS hist_dw_study_grant;
DROP TABLE IF EXISTS hist_dw_study_other_identifier;
DROP TABLE IF EXISTS hist_dw_study_outcome_measure;
DROP TABLE IF EXISTS hist_dw_study_participating_site;
DROP TABLE IF EXISTS hist_dw_study_participating_site_investigators;
DROP TABLE IF EXISTS hist_dw_study_secondary_purpose;
DROP TABLE IF EXISTS hist_dw_study_anatomic_site;
DROP TABLE IF EXISTS hist_dw_organization;
DROP TABLE IF EXISTS hist_dw_study_overall_status;
DROP TABLE IF EXISTS hist_dw_study_biomarker;
EOF

date
echo 'Creating DW dump and piping it to DW2 database'
pg_dump -h ncidb-p126.nci.nih.gov \
	-p 5472\
	-U copparead \
	-w \
	--clean \
	--create \
	--no-owner \
	-F p \
	-t dw_study \
	-t dw_study_overall_status \
	-t dw_study_anatomic_site \
	-t dw_organization \
	-t dw_study_arm_and_intervention \
	-t dw_study_association \
	-t dw_study_collaborator \
	-t dw_study_disease \
	-t dw_study_eligibility_criteria \
	-t dw_study_grant \
	-t dw_study_other_identifier \
	-t dw_study_outcome_measure \
	-t dw_study_participating_site \
	-t dw_study_participating_site_investigators \
	-t dw_study_secondary_purpose \
	-t dw_study_biomarker \
	-t hist_dw_study \
	-t hist_dw_study_biomarker \
    -t hist_dw_study_overall_status \
    -t hist_dw_study_anatomic_site \
    -t hist_dw_organization \
    -t hist_dw_study_arm_and_intervention \
    -t hist_dw_study_association \
    -t hist_dw_study_collaborator \
    -t hist_dw_study_disease \
    -t hist_dw_study_eligibility_criteria \
    -t hist_dw_study_grant \
    -t hist_dw_study_other_identifier \
    -t hist_dw_study_outcome_measure \
    -t hist_dw_study_participating_site \
    -t hist_dw_study_participating_site_investigators \
    -t hist_dw_study_secondary_purpose dw_ctrpn | psql -U ctrpdw2  -h localhost -p 5472 ctrpdw2


date
echo 'create clean DW2 data dump'
psql -U ctrpdw2  -h localhost -p 5472 ctrpdw2 <<EOF
DELETE FROM public.dw_study WHERE processing_status = 'Rejected';
DELETE FROM public.dw_study WHERE nct_id IS NULL;
DELETE FROM public.dw_study WHERE nct_id NOT LIKE 'NCT%';
DELETE FROM public.dw_study
WHERE nci_id NOT IN
(
with reporting_start_date as (select to_date('06/15/2015', 'MM/dd/yyyy')),

                reporting_end_date as (select current_date)

                select distinct(nci_id) from

                (select *, CASE WHEN internal_system_id in

                (

                with results as (

                select row_number() over(partition by nci_id order by status_date desc, internal_system_id desc) as row_num,*

                from dw_study_overall_status

                ) select internal_system_id from results where row_num =1

                )

                THEN now()

                ELSE lead(status_date) OVER(ORDER BY nci_id, status_date, internal_system_id)   END  as "lead_date"

                from dw_study_overall_status    ) as dw

                where ((status_date >= (select * from reporting_start_date)

                and  status_date<= (select * from reporting_end_date))

                or ( (select * from reporting_start_date) >= status_date

                and (select * from reporting_start_date)<=lead_date

                )) and status in ('IN_REVIEW', 'APPROVED','ACTIVE','ENROLLING_BY_INVITATION','TEMPORARILY_CLOSED_TO_ACCRUAL','TEMPORARILY_CLOSED_TO_ACCRUAL_AND_INTERVENTION')

                and nci_id in (select nci_id from dw_study where processing_status <> 'Rejected')

                order by nci_id
);


DELETE FROM public.dw_study_anatomic_site WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_arm_and_intervention WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_collaborator WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_disease WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_eligibility_criteria WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_grant WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_other_identifier WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_outcome_measure WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_overall_status WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_participating_site WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_participating_site_investigators WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_secondary_purpose WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_biomarker WHERE nci_id NOT IN (select nci_id from public.dw_study);
DELETE FROM public.dw_study_association WHERE study_a NOT IN (select nci_id from public.dw_study);

CREATE INDEX nci_id_idx1 ON hist_dw_study(nci_id);
CREATE INDEX nci_id_idx2 ON hist_dw_study_anatomic_site(nci_id);
CREATE INDEX nci_id_idx3 ON hist_dw_study_arm_and_intervention(nci_id);
CREATE INDEX nci_id_idx5 ON hist_dw_study_biomarker(nci_id);
CREATE INDEX nci_id_idx6 ON hist_dw_study_collaborator(nci_id);
CREATE INDEX nci_id_idx7 ON hist_dw_study_disease(nci_id);
CREATE INDEX nci_id_idx8 ON hist_dw_study_eligibility_criteria(nci_id);
CREATE INDEX nci_id_idx9 ON hist_dw_study_grant(nci_id);
CREATE INDEX nci_id_idx10 ON hist_dw_study_other_identifier(nci_id);
CREATE INDEX nci_id_idx11 ON hist_dw_study_outcome_measure(nci_id);
CREATE INDEX nci_id_idx12 ON hist_dw_study_overall_status(nci_id);
CREATE INDEX nci_id_idx13 ON hist_dw_study_participating_site(nci_id);
CREATE INDEX nci_id_idx14 ON hist_dw_study_participating_site_investigators(nci_id);
CREATE INDEX nci_id_idx15 ON hist_dw_study_secondary_purpose(nci_id);


CREATE INDEX run_id_idx1 ON hist_dw_study(run_id);
CREATE INDEX run_id_idx2 ON hist_dw_study_anatomic_site(run_id);
CREATE INDEX run_id_idx3 ON hist_dw_study_arm_and_intervention(run_id);
CREATE INDEX run_id_idx4 ON hist_dw_study_association(run_id);
CREATE INDEX run_id_idx5 ON hist_dw_study_biomarker(run_id);
CREATE INDEX run_id_idx6 ON hist_dw_study_collaborator(run_id);
CREATE INDEX run_id_idx7 ON hist_dw_study_disease(run_id);
CREATE INDEX run_id_idx8 ON hist_dw_study_eligibility_criteria(run_id);
CREATE INDEX run_id_idx9 ON hist_dw_study_grant(run_id);
CREATE INDEX run_id_idx10 ON hist_dw_study_other_identifier(run_id);
CREATE INDEX run_id_idx11 ON hist_dw_study_outcome_measure(run_id);
CREATE INDEX run_id_idx12 ON hist_dw_study_overall_status(run_id);
CREATE INDEX run_id_idx13 ON hist_dw_study_participating_site(run_id);
CREATE INDEX run_id_idx14 ON hist_dw_study_participating_site_investigators(run_id);
CREATE INDEX run_id_idx15 ON hist_dw_study_secondary_purpose(run_id);


EOF


#Copy pre amend trials
date
echo 'Checking for pre amendment copy of a study'

psql -U ctrpdw2 -w -h localhost -p 5472 -f ./copy_preamend.sql  ctrpdw2
echo 'Pre amendment copy done'

date
echo 'Finally, removing trials that do not NCT ID, do not have appropriate processing_status and filtering out biomarkers.'
psql -U ctrpdw2  -h localhost -p 5472 ctrpdw2 <<EOF

DELETE FROM public.dw_study WHERE nct_id IS NULL;
DELETE FROM public.dw_study WHERE nct_id NOT LIKE 'NCT%';
DELETE FROM public.dw_study WHERE processing_status NOT IN ('Abstraction Verified No Response', 'Abstraction Verified Response','Verification Pending','Abstracted');
DELETE FROM dw_study_biomarker where NOT (assay_purpose ilike '%Eligibility Criterion - Inclusion%' or assay_purpose ilike '%Eligibility Criterion - Exclusion%');

EOF

# Generating DW2 JSON
date
echo 'Generating DW2 JSON'
psql -U ctrpdw2 -w -h localhost -p 5472 -f ./trial_query.sql -o ./trials.out ctrpdw2

date
echo 'Uploading JSON to the S3 bucket'
aws s3 ls s3://datawarehouse-production/ --human-readable
aws s3 cp ./trials.out s3://datawarehouse-production/
aws s3 ls s3://datawarehouse-production/ --human-readable
zip trials.out.zip trials.out
rm trials.out
echo 'all done'	  
date
