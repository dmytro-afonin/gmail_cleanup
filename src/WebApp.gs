function getCalendar() {
  const calendarName = 'Delete Old Emails Calendar';
  const calendars = CalendarApp.getOwnedCalendarsByName(calendarName);
  if (!calendars.length) {
    return CalendarApp.createCalendar(calendarName, {
      summary: 'Run deletion emails which are 4y old when there is an event in calenday',
      timeZone: 'Europe/Ljubljana',
    });
  }

  return calendars[0];
}

function setupTriggersForUpcomingEvents() {
  const calendar = getCalendar();

  // Get events for the next day
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const events = calendar.getEvents(now, tomorrow);
  const t = ScriptApp.getUserTriggers();

  // Set up a time-based trigger for each event
  events.forEach(event => {
    const startTime = event.getStartTime();
    ScriptApp.newTrigger('deleteOldEmailsWithUserSettings')
      .timeBased()
      .at(startTime)
      .create();
  });
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}
