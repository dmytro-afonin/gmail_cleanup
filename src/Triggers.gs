function deleteOldEmailsWithUserSettings() {
  const userProps = PropertiesService.getUserProperties();
  userProps.setProperty('RUN_SOURCE', 'USER');
  const propObj = userProps.getProperties();
  deleteOldEmails(propObj, userProps);
}

function deleteOldEmailsWithCustomUserSettings() {
  const userProps = PropertiesService.getUserProperties();
  const propObj = userProps.getProperties();
  const custom = JSON.parse(propObj.custom);
  userProps.setProperty('RUN_SOURCE', 'CUSTOM');
  deleteOldEmails(custom, userProps);
}
