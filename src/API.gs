// get user settings
function loadUserProperties() {
  const userProps = PropertiesService.getUserProperties();
  if (!userProps.getProperty(OLDER_THAN_UNIT_KEY)) {
    initUser(userProps);
  }
  return userProps.getProperties();
}

// save user settings
function setUserSearchSettings(searchSettings) {
  const userProps = PropertiesService.getUserProperties();
  userProps.setProperties(searchSettings);
  return userProps.getProperties();
}

function restoreDefaults() {
  const userProps = PropertiesService.getUserProperties();
  userProps.setProperties(getDefaults());
  return userProps.getProperties();
}

// run with custom settings (not affect stored settings)
function runNow(searchSettings) {
  const userProps = PropertiesService.getUserProperties();

  const date = new Date();
  date.setMinutes(date.getMinutes() + 2);

  userProps.setProperties({
    custom: JSON.stringify(searchSettings),
    RUN_STATUS: 'SCHEDULED',
    SCHEDULED_TIME: `${date.getTime()}`
  });

  // Create a time-based trigger
  ScriptApp.newTrigger('deleteOldEmailsWithCustomUserSettings')
    .timeBased()
    .at(date)
    .create();

  return userProps.getProperties();
}
