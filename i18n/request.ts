import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !['en'].includes(locale)) {
    // Fallback to default locale if invalid or undefined
    locale = 'en';
  }

  return {
    messages: (await import(`../locales/${locale}.json`)).default,
    locale
  };
});