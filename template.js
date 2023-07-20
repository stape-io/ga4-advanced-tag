const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const getRequestHeader = require('getRequestHeader');
const getAllEventData = require('getAllEventData');
const getRequestBody = require('getRequestBody');
const getRequestQueryParameters = require('getRequestQueryParameters');
const encodeUriComponent = require('encodeUriComponent');
const JSON = require('JSON');
const parseUrl = require('parseUrl');
const Object = require('Object');
const sendHttpRequest = require('sendHttpRequest');
const getType = require('getType');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');
const userAgent = getRequestHeader('User-Agent');
const eventData = getAllEventData();
const eventName = data.eventName ? data.eventName : eventData.event_name;
let postUrl = 'https://www.google-analytics.com/g/collect';
const queryParams = getQueryParams();
const events = getEvents();

if (data.measurementId) {
  queryParams.tid = data.measurementId;
}

if (data.redactVisitorIP !== 'false') {
  queryParams._uip = encodeUriComponent('::');
  Object.delete(queryParams, 'ep.ip_override');
}

if (data.parametersToExclude && data.parametersToExclude.length) {
  data.parametersToExclude.forEach((param) => {
    Object.delete(queryParams, param.name);
    events.forEach((event) => {
      Object.delete(event, param.name);
    });
  });
}

if (data.parametersToOverride && data.parametersToOverride.length) {
  data.parametersToOverride.forEach((param) => {
    if (isValidParam(queryParams[param.name]) || param.addParam) {
      queryParams[param.name] = param.value;
    }
    events.forEach((event) => {
      if (isValidParam(event[param.name])) {
        event[param.name] = param.value;
      }
    });
  });
}

if (data.userPropertiesToExclude && data.userPropertiesToExclude.length) {
  data.userPropertiesToExclude.forEach((property) => {
    deleteUserProperty(queryParams, property.name);
    events.forEach((event) => {
      deleteUserProperty(event, property.name);
    });
  });
}

if (data.userPropertiesToAdd && data.userPropertiesToAdd.length) {
  const target = events.length ? events[0] : queryParams;
  data.userPropertiesToAdd.forEach((property) => {
    target['up.' + property.name] = property.value;
  });
}

const queryParamsString = objectToQueryString(queryParams);
if (queryParamsString) {
  postUrl = postUrl + '?' + queryParamsString;
}
const body = events.length
  ? events.map(objectToQueryString).join('\n')
  : undefined;
const headers = {
  'Content-Type': 'text/plain;charset=UTF-8',
  'User-Agent': userAgent,
};

if (data.requestHeaders && data.requestHeaders.length) {
  data.requestHeaders.forEach((header) => {
    headers[header.name] = header.value;
  });
}

if (isLoggingEnabled) {
  logToConsole(
    JSON.stringify({
      Name: 'GA4Advanced',
      Type: 'Request',
      TraceId: traceId,
      EventName: eventName,
    })
  );
}

sendHttpRequest(
  postUrl,
  {
    headers: headers,
    method: 'POST',
  },
  body
)
  .then((response) => {
    if (isLoggingEnabled) {
      logToConsole(
        JSON.stringify({
          Name: 'GA4Advanced',
          Type: 'Response',
          TraceId: traceId,
          EventName: eventName,
          ResponseStatusCode: response.statusCode,
          ResponseHeaders: response.headers,
          ResponseBody: response.body,
        })
      );
    }
    if (!data.useOptimisticScenario) {
        data.gtmOnSuccess();
    }
  })
  .catch(() => {
    if(!data.useOptimisticScenario) {
      data.gtmOnFailure();
    }
  });

if (data.useOptimisticScenario) {
  data.gtmOnSuccess();
}
function getQueryParams() {
  if (data.defaultParametersToInclude === 'none') return {};
  if (data.dataSource === 'request') return getQueryParamsFromRequest();
  return getQueryParamsFromEventData();
}

function getEvents() {
  if (data.dataSource === 'eventData') return [];
  const requestBody = getRequestBody();
  const requestBodyLines = requestBody ? requestBody.split('\n') : [];
  return requestBodyLines.map((requestBodyLine) => {
    return parseUrl('https://parse.com?' + requestBodyLine).searchParams;
  });
}

function getQueryParamsFromRequest() {
  const params = getRequestQueryParameters();
  if (data.defaultUserPropertiesToInclude === 'none') {
    Object.keys(params).forEach((key) => {
      if (key.indexOf('upn.') === 0 || key.indexOf('up.') === 0) {
        Object.delete(params, key);
      }
    });
  }
  return params;
}

function getQueryParamsFromEventData() {
  const params = {};
  const clientHints = eventData.client_hints || {};
  const settings = [
    /**
     * Request parameters:
     */
    {
      param: 'v', // (Protocol Version)
      value: eventData['x-ga-protocol_version'],
    },
    {
      param: 'tid', // (Tracking ID)
      value: eventData['x-ga-measurement_id'],
    },
    {
      param: 'gtm', // (GTM Hash Info),
      value: eventData['x-ga-gtm_version'],
    },
    {
      param: '_p', // (Random Page Load Hash)
      value: eventData['x-ga-page_id'],
    },
    {
      param: 'sr', // (Screen Resolution),
      value: eventData['screen_resolution'],
    },
    {
      param: 'ul', // (User Language),
      value: eventData['language'],
    },
    {
      param: 'dh', // (Document Hostname)
      value: undefined,
    },
    {
      param: 'cid', // (client Id),
      value: eventData['client_id'],
    },
    {
      param: '_s', // (Hit Counter)
      value: undefined,
    },
    {
      param: 'richsstsse', // (richsstsse)
      value: undefined, // param without value in query params, how to handle ???
    },
    /**
     * Shared:
     */
    {
      param: 'dl', // (Document location),
      value: eventData['page_location'],
    },
    {
      param: 'dt', // (Document title)
      value: eventData['page_title'],
    },
    {
      param: 'dr', // (Document referrer)
      value: undefined,
    },
    {
      param: '_z', // (_z) - some hash
      value: undefined,
    },
    {
      param: '_eu', // (Event usage)
      value: undefined,
    },
    {
      param: 'edid', // (Event Debug ID?)
      value: undefined,
    },
    {
      param: '_dbg', // (is Debug)
      value: eventData.debug_mode === 'true' ? 1 : undefined,
    },
    {
      param: 'ir', // (Ignore Referrer)
      value: undefined,
    },
    {
      param: 'tt', // (Traffic Type)
      value: undefined,
    },
    {
      param: 'gcs', // (Google Consent Status)
      value: undefined,
    },
    {
      param: 'gcu', // (Google Consent Update)
      value: undefined,
    },
    {
      param: 'gcut', // (Google Consent Update Type)
      value: undefined,
    },
    {
      param: 'gcd', // (Google Consent Default)
      value: undefined,
    },
    {
      param: '_glv', // (is Google Linker Valid)
      value: undefined,
    },
    /**
     * Event Parameters:
     */
    {
      param: 'en', // (Event Name)
      value: eventName,
    },
    {
      param: '_et', // (Engagement Time)
      value: eventData.engagement_time_msec,
    },
    {
      param: '_c', // is Conversion
      value: eventData['x-ga-system_properties']
        ? eventData['x-ga-system_properties'].c
        : undefined,
    },
    {
      param: '_ee', // external event
      value: undefined,
    },
    {
      param: 'ep.debug_mode',
      value: eventData.debug_mode,
    },
    {
      param: 'ep.event_id',
      value: eventData.event_id,
    },
    {
      param: 'ep.value',
      value: eventData.value,
    },
    {
      param: 'ep.transaction_id',
      value: eventData.transaction_id,
    },
    {
      param: 'ep.tax',
      value: eventData.tax,
    },
    {
      param: 'ep.shipping',
      value: eventData.shipping,
    },
    {
      param: 'ep.payment_type',
      value: eventData.payment_type,
    },
    {
      param: 'ep.city',
      value: eventData.city,
    },
    {
      param: 'ep.phone',
      value: eventData.phone,
    },
    {
      param: 'ep.object',
      value: eventData.object,
    },
    {
      param: 'ep.long',
      value: eventData.long,
    },
    {
      param: 'ep.cyr',
      value: eventData.cyr,
    },
    {
      param: 'ep.cyrl',
      value: eventData.cyrl,
    },
    {
      param: 'ep.percent_scrolled',
      value: eventData.percent_scrolled,
    },
    {
      param: 'ep.plays_count',
      value: eventData.plays_count,
    },
    /**
     * E-Commerce Main:
     */
    {
      param: 'cu', // Currency Code
      value: eventData.currency,
    },
    {
      param: 'ep.affiliation', // Affiliation
      value: undefined,
    },
    {
      param: 'epn.value', // Transaction Revenue
      value: eventData.value, // ???
    },
    {
      param: 'epn.tax', // Transaction Tax
      value: eventData.tax, // ???
    },
    {
      param: 'epn.shipping', // Transaction Shipping
      value: eventData.shipping, // ???
    },
    {
      param: 'pi', // Promotion ID
      value: undefined,
    },
    {
      param: 'pn', // Promotion Name
      value: undefined,
    },
    {
      param: 'cn', // Creative Name
      value: undefined,
    },
    {
      param: 'cs', // Creative Slot
      value: undefined,
    },
    {
      param: 'lo', // Location id
      value: undefined,
    },
    /**
     * Campaign Attribution:
     */
    {
      param: 'cm', // Campaign Medium
      value: undefined,
    },
    {
      param: 'cs', // Campaign Source
      value: undefined,
    },
    {
      param: 'cn', // Campaign Name
      value: undefined,
    },
    {
      param: 'cc', // Campaign Content
      value: undefined,
    },
    {
      param: 'ck', // Campaign Term
      value: undefined,
    },
    {
      param: 'ccf', // Campaign Creative Format
      value: undefined,
    },
    {
      param: '_rnd', // Gclid Deduper
      value: undefined,
    },
    // Session / User Related:
    {
      param: 'uid', // User Id
      value: eventData.user_id,
    },
    {
      param: '_fid', // Firebase Id
      value: eventData.firebase_id, // ???
    },
    {
      param: 'sid', // Session Id
      value: eventData.ga_session_id,
    },
    {
      param: 'sct', // Session count
      value: eventData.ga_session_number,
    },
    {
      param: 'seg', // Session Engagement
      value: eventData['x-ga-mp2-seg'], // ???
    },
    {
      param: '_fv', // First Visit
      value: undefined, // If the "_ga_THYNGSTER" cookie is not set, the first event will have this value present. This will internally create a new "first_visit" event on GA4. If this event is also a conversion the value will be "2" if not, will be "1"
    },
    {
      param: '_ss', // Session start
      value: undefined, // If the "_ga_THYNGSTER" cookie last session time value is older than 1800 seconds, the current event will have this value present. This will internally create a new "session_start" event on GA4. If this event is also a conversion the value will be "2" if not, will be "1"
    },
    {
      param: '_fplc', // First Party Linker Cookie
      value: undefined,
    },
    {
      param: '_nsi', // New Session Id
      value: undefined,
    },
    {
      param: 'gdid', // Google Developer ID
      value: undefined,
    },
    {
      param: '_uc', // User Country
      value: undefined,
    },
    // Client Hints:
    {
      param: 'uaa', // User Agent Architecture
      value: clientHints.architecture,
    },
    {
      param: 'uab', // User Agent Bitness
      value: clientHints.bitness,
    },
    {
      param: 'uafvl', // User Agent Full Version List
      value: clientHints.full_version_list
        ? clientHints.full_version_list
            .map((item) => {
              return (
                encodeUriComponent(item.brand) +
                ';' +
                encodeUriComponent(item.version)
              );
            })
            .join('|')
        : undefined,
    },
    {
      param: 'uamb', // User Agent Mobile
      value: clientHints.mobile ? 1 : 0,
    },
    {
      param: 'uam', // User Agent Model
      value: clientHints.model,
    },
    {
      param: 'uap', // User Agent Platform
      value: clientHints.platform,
    },
    {
      param: 'uapv', // User Agent Platform Version
      value: clientHints.platform_version,
    },
    {
      param: 'uaw', // User Agent WOW64
      value: clientHints.wow64 ? 1 : 0,
    },
    /**
     * Uncategorized / Missing Info:
     */
    {
      param: 'gtm_up', //
      value: undefined,
    },
    {
      param: '_ecid', // European Consent Mode Enabled ID
      value: undefined,
    },
    {
      param: '_uei', //
      value: undefined,
    },
    {
      param: '_gaz', // Create Google Join
      value: undefined,
    },
    {
      param: '_rdi', // Redact Device Info
      value: undefined, // Maybe data.redactVisitorIP ???
    },
    {
      param: '_geo', // Geo Granularity
      value: undefined,
    },
    {
      param: 'us_privacy', // US Privacy Signal
      value: undefined,
    },
    {
      param: 'gdpr', // GDPR applies or not (IAB TCFv2)
      value: undefined,
    },
    {
      param: 'gdpr_consent', // GDPR Vendors Lists IDs (GVL ID)(IAB TCFv2)
      value: undefined,
    },
  ];
  /**
   * Items Parameters
   */
  if (eventData.items && eventData.items.length) {
    eventData.items.forEach((item) => {
      const value = [
        {
          param: 'id',
          value: item.item_id,
        },
        {
          param: 'nm',
          value: item.item_name,
        },
        {
          param: 'ln',
          value: item.item_list_name,
        },
        {
          param: 'ln',
          value: item.item_list_id,
        },
        {
          param: 'br',
          value: item.item_brand,
        },
        {
          param: 'ca',
          value: item.item_category,
        },
        {
          param: 'ca2', // c2 or ca2 ??? ga4 base - c2 but https://www.thyngster.com/ga4-measurement-protocol-cheatsheet/ - ca2
          value: item.item_category2,
        },
        {
          param: 'ca3',
          value: item.item_category3,
        },
        {
          param: 'ca4',
          value: item.item_category4,
        },
        {
          param: 'ca5',
          value: item.item_category5,
        },
        {
          param: 'va',
          value: item.item_variant,
        },
        {
          param: 'lp',
          value: item.index,
        },
        {
          param: 'qt',
          value: item.quantity,
        },
        {
          param: 'pr',
          value: item.price,
        },
        {
          param: 'cp',
          value: item.coupon, // ??
        },
        {
          param: 'ds',
          value: item.discount, // ??
        },
        {
          param: 'af',
          value: item.affiliation, // ??
        },
      ];
      settings.push({
        param: 'pr' + item.index,
        value: value
          .filter((setting) => isValidParam(setting.value))
          .map((setting) => setting.param + setting.value)
          .join('~'),
      });
    });
  }
  /**
   * User properties
   */
  if (data.defaultUserPropertiesToInclude === 'all') {
    const userProperties = eventData['x-ga-mp2-user_properties'] || {};
    Object.keys(userProperties).forEach((key) => {
      settings.push({
        param: 'up.' + key,
        value: userProperties[key],
      });
    });
  }
  settings.forEach((setting) => {
    if (isValidParam(setting.value)) {
      params[setting.param] = setting.value;
    }
  });
  return params;
}

function deleteUserProperty(obj, propertyName) {
  if (obj['up.' + propertyName]) {
    Object.delete(obj, 'up.' + propertyName);
  }
  if (obj['upn.' + propertyName]) {
    Object.delete(obj, 'upn.' + propertyName);
  }
}

function objectToQueryString(obj) {
  return Object.keys(obj)
    .map((key) =>
      isValidParam(obj[key]) ? key + '=' + encodeUriComponent(obj[key]) : key
    )
    .join('&');
}

function determinateIsLoggingEnabled() {
  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function isValidParam(value) {
  const valueType = getType(value);
  return valueType !== 'undefined' && valueType !== 'null' && value !== '';
}
