#!/bin/bash

_script="$(readlink -f ${BASH_SOURCE[0]})"
_base="$(dirname $_script)"


function usage
{
    echo "usage: ctapi.sh <program>"
    echo "  Where <program> is one of the following:"
    echo "      indexer - only runs the indexer, then exits"
    echo "      api - runs the API service"
    echo "      index_api - runs both the indexer and the API once indexing has finished"
}

function run_indexer
{    

    set_config
    
    echo "Running Indexer..."

    ## Make sure we are in the app root.    
    cd $_base

    ## Move into the transformer
    pushd ./import/transform

    ## Run transformer
    npm run transform-trials
    transform_exitc=$?
    if [ $transform_exitc -ne 0 ]; then
        echo "Transformer Failed. Exiting..."
        exit $transform_exitc
    fi

    ## Go back to the main app folder.
    popd

    ## Go to indexer.
    pushd ./search/index

    ## Run indexer
    npm run index
    indexer_exitc=$?
    if [ $indexer_exitc -ne 0 ]; then
        echo "Indexer Failed. Exiting..."
        exit $indexer_exitc
    fi    

    # Backup to main app folder
    popd

    echo "Indexer Completed..."

    exit 0
}

function run_api
{
    echo "api"
}

function run_both
{
    echo "both"
}

case $1 in
    indexer )   run_indexer
                ;;
    api )       run_api
                ;;
    index_api ) run_both
                ;;
    * )         usage
                exit 1
esac

exit 0