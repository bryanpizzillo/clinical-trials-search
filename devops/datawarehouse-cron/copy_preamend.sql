create or replace function copy_pre_amendment_records() returns void
language plpgsql as $$
 declare
 rec record;
 amendment_record record;
 study_nci_id varchar(50);
 amend_study_run_id varchar(50);
 results text;
 stmt text;
 columnNames text;
 tableNames varchar[] := ARRAY['dw_study','dw_study_anatomic_site','dw_study_arm_and_intervention',
 'dw_study_collaborator','dw_study_disease','dw_study_eligibility_criteria','dw_study_grant',
 'dw_study_other_identifier','dw_study_outcome_measure','dw_study_overall_status',
 'dw_study_participating_site','dw_study_participating_site_investigators','dw_study_secondary_purpose','dw_study_association','dw_study_biomarker'];
 tableName varchar(1000);

begin
	--Locate studies that has been amended and are undergoing an abstraction process
	for rec in select nci_id  from dw_study where amendment_date is not null and lower(processing_status)
	in ('amendment submitted','accepted','on-hold')  loop
	study_nci_id := rec.nci_id;

		foreach tableName in array tableNames
		loop
		-- Delete records
		IF tableName <> 'dw_study_association' THEN
			EXECUTE 'delete from ' || tableName || ' where nci_id=''' || rec.nci_id||'''';
		ELSE
			EXECUTE 'delete from ' || tableName || ' where study_a=''' || rec.nci_id||'''';
		END IF;	
		--raise notice 'tableName here %',tableName;
		end loop;

		--Check if pre amendment copy exists 
		for amendment_record in select run_id FROM hist_dw_study 
		where nci_id=rec.nci_id  
		and lower(processing_status) not in ('amendment submitted', 'accepted', 'on-hold', 'submitted', 'submission terminated', 'rejected') 
		order by run_id desc limit 1 loop
		amend_study_run_id := amendment_record.run_id;
		foreach tableName in array tableNames
		loop	
			IF tableName <> 'dw_study_association' THEN
			columnNames := array_to_string(ARRAY(SELECT  c.column_name::text
                FROM information_schema.columns As c
                WHERE table_name = 'hist_'||tableName 
                AND  c.column_name NOT IN('run_id')
                ), ',') ;
                stmt := ' SELECT ' ||  columnNames || ' FROM hist_'||tableName|| '  WHERE nci_id='''||rec.nci_id||''' AND run_id='''||amend_study_run_id||''''  As sqlstmt ;
			 ELSE
			columnNames := array_to_string(ARRAY(SELECT  c.column_name::text
                FROM information_schema.columns As c
                WHERE table_name = 'hist_'||tableName 
                AND  c.column_name NOT IN('run_id')
                ), ',') ;
               stmt := ' SELECT ' ||  columnNames || ' FROM hist_'||tableName|| ' As o WHERE study_a='''||rec.nci_id||''' AND run_id='''||amend_study_run_id||''''As sqlstmt ;
				
			END IF;
			
            EXECUTE  'INSERT INTO '|| tableName || '('  || columnNames  ||  ')' || stmt;
		end loop;
	
	end loop;
 end loop;
 end $$;
 
 select copy_pre_amendment_records();