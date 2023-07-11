# homebridge-intellinet-pdu
Homebridge plugin for Intellinet IP PDU

This plugin adds support for the Intellinet Smart PDU to homebridge.
All switches can be enabled / disabled and the temperature/humidity
sensors are read.

Simple configuration example (accessories section):
```
"accessories": [
  {
    "name": "PDU Office",
    "host": "10.10.0.31",
    "username": "admin",
    "password": "password",
    "switchNames": [
      {
        "position": 0,
        "name": "Router",
        "enabled": true
      },
      {
        "position": 1,
        "name": "Computer",
        "enabled": true
      }
    ],
  "accessory": "IntellinetPDU"
  }
]
```
