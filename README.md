# Real-Time Stream Processing for IoT using Google Cloud Functions

This directory contains a sample of a real-time stream processing architecture for IoT using Google Cloud Platform. It is a simplified version of the [Solution Architecture for Real-Time Stream Processing for IoT](https://cloud.google.com/solutions/architecture/real-time-stream-processing-iot) that is using [Google Cloud Functions](https://cloud.google.com/functions/) instead of [Google Cloud Dataflow](https://cloud.google.com/dataflow/) to process the messages on the [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/) topic. Once the messages are processed they are inserted into a table stored in [Google Cloud Bigtable](https://cloud.google.com/bigtable/). Finally the sample shows how to create a table in [Google Cloud BigQuery](https://cloud.google.com/bigquery/) using the table stored in Cloud BigTable as a federated data source.

The IoT device used on this example is a Raspberry Pi with a Rainbow Hat that is used to measure temperature and pressure. It is using the [Pimoroni Python driver for Rainbow HAT](https://github.com/pimoroni/rainbow-hat).

## Table of Contents
1. [Google Cloud Platform](#gcp)
  2. [Create Pub/Sub topic](#pubsub)
  3. [Create the Bigtable instance](#bigtable)
  4. [Create the table](#createtable)
  5. [Create the Cloud Function](#createfunction)
6. [Client](#client)
7. [Create federated table in BigQuery](#bigquery)
8. [Next Steps](#nextsteps)

## <a name="gcp"></a>1. Google Cloud Platform

The data gathered from the IoT devices is going to be ingested and stored in Google Cloud Platform. The following steps explain how to set up all the components involved in this process.

This sample assumes that you already have a Google Cloud Platform project created. Check the [documentation](https://cloud.google.com/resource-manager/docs/creating-managing-projects) if you need help creating the project.

## <a name="pubsub"></a>2. Create Pub/Sub topic

Execute the gcloud init command to initialize or reinitialize gcloud. This starts an interactive workflow that authorizes gcloud and other SDK tools to access Google Cloud Platform using your user account credentials, and sets properties in a gcloud configuration, including the current project and the default Google Compute Engine region and zone.

If you are using [Cloud Shell](https://cloud.google.com/shell/docs/features) you can skip this step.
```bash
gcloud init
```

Once you have your project set up and you are authorized to access Google Cloud Platform, use the gcloud to create the pubsub topic, by executing the following command, replacing [MY-IOT-PROJECT] with your project ID:
```bash
gcloud beta pubsub topics create <MY-TOPIC> --project <MY-IOT-PROJECT>
```
## <a name="bigtable"></a>3. Create the Bigtable instance

Follow the steps described in [Creating a Cloud Bigtable Instance](https://cloud.google.com/bigtable/docs/creating-instance) to create a Bigtable instance. For this sample you can use a DEVELOPMENT instance.

## <a name="createtable"></a>4. Create the table

Configure cbt to use your project and instance by modifying the .cbtrc file, replacing [MY-IOT-PROJECT] with your project ID, and [my-iot-instance] with your instance ID (used on step 3):

```bash
echo project = [MY-IOT-PROJECT] > ~/.cbtrc
echo instance = [my-iot-instance] >> ~/.cbtrc
```

Execute the "cbt createtable" command to create a table called data in your new Cloud Bigtable instance.

```bash
cbt createtable data
```

Finally execute the following commands to create a column family on the "data" table. The column family "data" is going to be used to store the temperature and pressure.

```bash
cbt createfamily data data
```

NOTE: You might need to install the cbt command.

```bash
gcloud components update
gcloud components install cbt
```

## <a name="createfunction"></a>5. Create the Cloud Function

The code of the Cloud Function that is going to be used to process the pub/sub messages is in the [index.js](index.js) file, and all its dependencies are defined in [package.json](package.json).

Clone or Download both files to your local directory (this can also be Cloud Shell), and edit the ZONE and INSTANCE on lines 16 and 17 to match the configuration of your Cloud Bigtable instance. 

```javascript
const INSTANCE = "my-iot-instance";
const ZONE = "us-central1-c";
```

Once you have your function ready to be deployed, execute the following command to deploy it on Google Cloud Platform using Google Cloud Pub/Sub as the [trigger](https://cloud.google.com/functions/docs/concepts/events-triggers), replacing [MY-STAGE-BUCKET] with the name of the Google Cloud Storage bucket (follow the steps described [here](https://cloud.google.com/storage/docs/creating-buckets) if you need to create one) that is going to be used for staging, and [MY-TOPIC] with the name of the topic used on step 1:

```bash
gcloud beta functions deploy processMessage --stage-bucket <MY-STAGE-BUCKET> --trigger-topic <MY-TOPIC>
```

## <a name="client"></a>6.Client
A pubsub client, running on the Raspberry Pi is responsible for publishing the telemetry obtained from the Rainbow HAT, since the Rainbow HAT already offers a python library to do this, the sample pubsub client is written in python as well. This client is measuring the temperature and pressure every half a second, displaying the temperature on the 14-segment display, and publishing that data to a pub/sub topic.

### gcloud setup

Follow the steps described on the [gcloud Installation Guide](https://cloud.google.com/sdk/downloads#apt-get) to install gcloud on the raspberry pi. That is going to be used to authenticate the raspberry pi against google cloud. 
NOTE: If you don't want to install gcloud on the device, you can use a service account and an application credential instead

### Authentication

Execute the folowing command to authenticate against Google Cloud Platform.

```bash
gcloud auth application-default login
```
### Copy Client

The code of the Client that is going to be used to publish the pub/sub messages is in the [iot_client.py](iot_client.py) file, and all its dependencies are defined in [requirements.txt](requirements.txt).

Clone or Download both files to your device, and edit the TOPIC-NAME on line 11 to match the name of the pub/sub topic created on step 1. 

### Install Dependencies

To install the pubsub client library:

```bash
pip install -r requirements.txt
```

Follow the steps described [here](https://github.com/pimoroni/rainbow-hat) to install the rainbow-hat library.

### Execute the Sample Client

To execute the client:

```bash
python iot_client.py
```

You should see the current temperature on the display of the Rainbow HAT, and the json payload sent to pub/sub on the output of the terminal every 0.5 seconds.

Also, if you go to the [Stackdriver Logging viewer](https://console.cloud.google.com/logs/viewer), you should see the logs for the cloud function that is processing those messages.

## <a name="bigquery"></a>7. BigQuery

To create the federated table go to the [BigQuery Console](https://bigquery.cloud.google.com) and create a dataset in your project.

Create a new table on that dataset with the following options:
1. Location: Google Cloud Bigtable with this source 
```
https://googleapis.com/bigtable/projects/<MY-PROJECT>/instances/<MY-CLOUD-BIGTABLE-INSTANCE>/tables/<MY-CLOUD-BIGTABLE-TABLE>
```
2. On the Column Family and Qualifiers section, click on Edit as Text and paste the following JSON.

```json
[
    {
        "familyId": "data",
        "type": "BYTES",
        "encoding": "TEXT",
        "onlyReadLatest": false,
        "columns": [
            {
                "qualifierString": "temperature",
                "type": "FLOAT",
                "encoding": "TEXT"
            },
            {
                "qualifierString": "pressure",
                "type": "FLOAT",
                "encoding": "TEXT"
            }
        ]
    }
]
```
3. Make sure to select "Read row key as string" on the Options section.

Click create table.

Finaly execute this query to get some data from your data table using SQL.

```SQL
SELECT LEFT(rowkey,10) as key, 
data.temperature.cell.timestamp, 
data.temperature.cell.value , 
data.pressure.cell.value
FROM [<MY-PROJECT>:<MY-DATASET>.data] 
LIMIT 100
```
## <a name="nextsteps"></a>8. Next Steps

Try to create a dashboard in [Data Studio](https://www.google.com/analytics/data-studio/) showing a summary of the data that you are gathering from your IoT devices.

Create a web application using the pub/sub client library and a subscription to your TOPIC, to show the measurements in real time.
