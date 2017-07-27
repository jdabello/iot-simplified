#to publish the message to pubsub
from google.cloud import pubsub
#to use the sensor and the display of the Rainbow HAT
import rainbowhat as rh
#to sleep the process for half a second
import time
#to create the message
import json

#constants
TOPIC_NAME = "<MY-TOPIC>"
DEVICE_ID = "rasp-bi-00"

#pubsub client and topic
pubsub_client = pubsub.Client()
topic = pubsub_client.topic(TOPIC_NAME)

#method to publish the message
def publish_to_pubsub(data):
    print data
    data = data.encode('utf-8')
    message_id = topic.publish(data)
    print('Message {} published.'.format(message_id))

#method to create the json payload
def get_payload(temp,pressure):
    data = {}
    data["device_id"]=DEVICE_ID
    data["temperature"]=temp
    data["pressure"]=pressure
    return json.dumps(data)
    
if __name__ == '__main__':
    while True:
        #get temperature from the Rainbow HAT
        t = rh.weather.temperature()
        #clear display of the Rainbow HAT
        rh.display.clear()
        #print current temperature on the display of the Rainbow HAT
        rh.display.print_float(t)
        rh.display.show()
        #get pressure from the Rainbow HAT
        p = rh.weather.pressure()
        #publish message to pubsub
        publish_to_pubsub(get_payload(t,p))
        time.sleep(0.5)
