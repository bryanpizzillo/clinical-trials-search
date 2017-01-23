#!/bin/bash

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
    echo "indexer"
    ls -l .
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