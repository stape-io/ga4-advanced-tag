# GA4 Advanced tag for Google Tag Manager Server Side

GA4 Advanced provides opensource alternative to GA4 Base Tag 
There are few key features provided by current tag:
- Ability to override all parameters (including _gcs and cid)
- Data Source settings - you can build request to google analytics using eventData properties (Beta)
- Compatible with Google Analytics 4 Measurement Protocol

## How to use the GA4 Advanced tag:

1. Create an GA4 Advanced tag and add GA4 triggers
2. All fields are optional.

**Measurement ID** - If the event came from a GA4 web tag, you can leave this field blank to inherit the measurement ID of the event

**Redact visitor IP address** - Remove visitor IP address from the event. Reports based on the event will not include geographic information.

**Event Name** - The event name to send to Google. If this field is blank, the value of the event_name parameter will be sent.

**Event Parameters** - Specify which parameters you want to include by default, add overwrites or remove existing.

**User Properties** - Specify which user properties you want to include by default, add overwrites or remove existing.

**Data Source Settings** - By default - incoming requests will be used as a data source for requests to google analytics. You can also choose Event Data (Beta) - in this case, all request properties will be constructed from eventData. We have a list of parameters copied from [thyngster.com](https://www.thyngster.com/ga4-measurement-protocol-cheatsheet/) (Thanks a lot for your work ❤️), but for now, we don't have a mapping for all of these parameters, so you are welcome to open PR with improvements and fixes.  

**Logs Settings** - Specify whether the tag should write to the logs.


### Useful links:

- [How to Set Up GA4 Tracking Using Google Tag Manager Server-Side Container](https://stape.io/blog/how-to-set-up-ga4-tracking-using-google-tag-manager-server-side-container)

## Open Source

GA4 Advanced Tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
