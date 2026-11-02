import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToMinutes,
  formatTimeTo12Hour,
  validateHours,
  getLiveStatusInfo,
  DEFAULT_HOURS
} from '../src/main.js';

test('parseTimeToMinutes parses valid HH:MM formats correctly', () => {
  assert.equal(parseTimeToMinutes('00:00'), 0);
  assert.equal(parseTimeToMinutes('01:30'), 90);
  assert.equal(parseTimeToMinutes('11:00'), 660);
  assert.equal(parseTimeToMinutes('15:00'), 900);
  assert.equal(parseTimeToMinutes('18:00'), 1080);
  assert.equal(parseTimeToMinutes('23:59'), 1439);
});

test('parseTimeToMinutes rejects invalid inputs', () => {
  assert.equal(parseTimeToMinutes(''), null);
  assert.equal(parseTimeToMinutes(null), null);
  assert.equal(parseTimeToMinutes('24:00'), null);
  assert.equal(parseTimeToMinutes('12:60'), null);
  assert.equal(parseTimeToMinutes('abc'), null);
  assert.equal(parseTimeToMinutes('12:5'), null);
});

test('formatTimeTo12Hour formats times with AM/PM and minutes correctly', () => {
  assert.equal(formatTimeTo12Hour('00:00'), '12:00 AM');
  assert.equal(formatTimeTo12Hour('09:05'), '9:05 AM');
  assert.equal(formatTimeTo12Hour('11:00'), '11:00 AM');
  assert.equal(formatTimeTo12Hour('12:00'), '12:00 PM');
  assert.equal(formatTimeTo12Hour('15:00'), '3:00 PM');
  assert.equal(formatTimeTo12Hour('18:00'), '6:00 PM');
  assert.equal(formatTimeTo12Hour('23:45'), '11:45 PM');
  assert.equal(formatTimeTo12Hour('invalid'), '');
  assert.equal(formatTimeTo12Hour(''), '');
});

test('validateHours validates default schedule as true', () => {
  const result = validateHours(DEFAULT_HOURS);
  assert.equal(result.valid, true);
});

test('validateHours catches lunch start >= lunch end', () => {
  const invalid = {
    lunchStart: '15:00',
    lunchEnd: '11:00',
    dinnerStart: '18:00',
    dinnerEnd: '23:00',
    listingNote: 'Test note'
  };
  const result = validateHours(invalid);
  assert.equal(result.valid, false);
  assert.match(result.error, /Lunch closing time must be later/i);
});

test('validateHours catches dinner start < lunch end', () => {
  const invalid = {
    lunchStart: '11:00',
    lunchEnd: '16:00',
    dinnerStart: '15:00',
    dinnerEnd: '23:00',
    listingNote: 'Test note'
  };
  const result = validateHours(invalid);
  assert.equal(result.valid, false);
  assert.match(result.error, /Dinner reopening time cannot be earlier/i);
});

test('validateHours catches dinner start >= dinner end', () => {
  const invalid = {
    lunchStart: '11:00',
    lunchEnd: '15:00',
    dinnerStart: '22:00',
    dinnerEnd: '20:00',
    listingNote: 'Test note'
  };
  const result = validateHours(invalid);
  assert.equal(result.valid, false);
  assert.match(result.error, /Dinner closing time must be later/i);
});

test('validateHours catches empty listingNote', () => {
  const invalid = {
    lunchStart: '11:00',
    lunchEnd: '15:00',
    dinnerStart: '18:00',
    dinnerEnd: '23:00',
    listingNote: '   '
  };
  const result = validateHours(invalid);
  assert.equal(result.valid, false);
  assert.match(result.error, /schedule note cannot be empty/i);
});

test('getLiveStatusInfo calculates lunch open, break, dinner, and closed states', () => {
  const hours = {
    lunchStart: '11:00', // 660 mins
    lunchEnd: '15:00',   // 900 mins
    dinnerStart: '18:00', // 1080 mins
    dinnerEnd: '23:00',  // 1380 mins
    listingNote: 'Closes 3 pm · Reopens 6 pm'
  };

  // 1. Morning before lunch (8:00 AM = 480 mins)
  const morning = getLiveStatusInfo(hours, 480);
  assert.equal(morning.isOpen, false);
  assert.equal(morning.statusType, 'closed');
  assert.match(morning.statusMsg, /Closed Now · Reopens at 11:00 AM/);

  // 2. Lunch shift (1:30 PM = 810 mins)
  const lunch = getLiveStatusInfo(hours, 810);
  assert.equal(lunch.isOpen, true);
  assert.equal(lunch.statusType, 'open');
  assert.match(lunch.statusMsg, /Open Now for Lunch · Closes at 3:00 PM/);

  // 3. Afternoon break (4:15 PM = 975 mins)
  const afternoon = getLiveStatusInfo(hours, 975);
  assert.equal(afternoon.isOpen, false);
  assert.equal(afternoon.isBreak, true);
  assert.equal(afternoon.statusType, 'break');
  assert.match(afternoon.statusMsg, /Afternoon Break · Reopens at 6:00 PM/);

  // 4. Dinner shift (8:00 PM = 1200 mins)
  const dinner = getLiveStatusInfo(hours, 1200);
  assert.equal(dinner.isOpen, true);
  assert.equal(dinner.statusType, 'open');
  assert.match(dinner.statusMsg, /Open Now for Dinner · Closes at 11:00 PM/);

  // 5. Late night after dinner (11:30 PM = 1410 mins)
  const lateNight = getLiveStatusInfo(hours, 1410);
  assert.equal(lateNight.isOpen, false);
  assert.equal(lateNight.statusType, 'closed');
  assert.match(lateNight.statusMsg, /Closed Now · Reopens at 11:00 AM/);
});
