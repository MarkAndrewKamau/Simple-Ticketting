// Single source of truth for every event detail shown on the page.
// NOTE: the two flyers disagree on the weekday (one says Saturday, one says
// Friday). Update `date.weekday` here once confirmed.

export const event = {
  school: 'Grace Height Heritage Academy',
  motto: ['Excellence in Learning', 'Integrity in Living'],
  title: 'Family Connection',
  titleLead: 'The',
  titleTail: 'Experience',
  tagline: ['Know Your Child.', 'Grow Your Child.'],
  intro: 'A meaningful family day to connect, discover, learn & grow together.',
  audience: 'Baby Care, Playgroup, PP1, PP2 & Grade 1–4',

  date: {
    weekday: 'Saturday',
    full: '15th August 2025',
    short: '15 Aug',
  },
  time: '11:00 AM – 5:00 PM',
  venue: 'Grace Height Heritage Academy',
  phone: '0707 777 978',
  phoneIntl: '254707777978',

  ticket: {
    priceKes: 1500,
    unit: 'per child',
  },

  pillars: [
    {
      icon: 'chat',
      color: 'teal',
      title: 'Behaviour is communication.',
      body: 'Discover how your child learns, plays and connects.',
    },
    {
      icon: 'heart',
      color: 'coral',
      title: 'Intentional connection',
      body: 'helps children grow loved, secure, understood and confident.',
    },
    {
      icon: 'family',
      color: 'gold',
      title: 'Stronger together.',
      body: 'Learn, support and grow as a family.',
    },
  ],

  enjoy: [
    { icon: 'discover', text: 'Child learning & personality discovery' },
    { icon: 'mic', text: 'Parent Masterclass at 3:00 PM' },
    { icon: 'consult', text: 'One-on-one consultations' },
    { icon: 'bond', text: 'Parent-child bonding activities' },
    { icon: 'castle', text: 'Free bouncing castle & face painting' },
    { icon: 'food', text: 'Food available from vendors' },
  ],

  itinerary: [
    { time: '11:00 AM', label: 'Registration & Welcome' },
    { time: '11:30 AM', label: 'School Tour & Family Orientation' },
    { time: '12:00 PM', label: 'Child Discovery Activities Begin' },
    { time: '1:00 PM', label: 'Family Play & Activity Stations' },
    { time: '2:00 PM', label: 'One-on-One Consultations / Observations' },
    { time: '3:00 PM', label: 'Parent Masterclass' },
    { time: '4:00 PM', label: 'Parent-Child Bonding Activity' },
    { time: '4:45 PM', label: 'Closing, Admissions Enquiries & Networking' },
    { time: '5:00 PM', label: 'End of Event' },
  ],

  together: [
    { label: 'Learn together', color: 'teal' },
    { label: 'Discover together', color: 'gold' },
    { label: 'Play together', color: 'navy' },
    { label: 'Create together', color: 'teal' },
    { label: 'Fun together', color: 'coral' },
  ],

  values: ['Christ-Centered', 'Safe Environment', 'Caring Teachers', 'Holistic Education'],
}

export const formatKes = (amount) => `KSh ${amount.toLocaleString('en-KE')}`
