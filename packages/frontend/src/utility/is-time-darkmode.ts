import { store } from '@/store.js';

const defaultZenith = 90.8333;
const degreesPerHour = 360 / 24;
const msecInHour = 60 * 60 * 1000;

const defaultLongitude = 139.75;
const defaultLatitude = 35.68;

function getDayOfYear(date: Date): number {
	return Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 8.64e7);
}

function sinDeg(deg: number): number {
	return Math.sin(deg * 2.0 * Math.PI / 360.0);
}

function acosDeg(x: number): number {
	return Math.acos(x) * 360.0 / (2 * Math.PI);
}

function asinDeg(x: number): number {
	return Math.asin(x) * 360.0 / (2 * Math.PI);
}

function tanDeg(deg: number): number {
	return Math.tan(deg * 2.0 * Math.PI / 360.0);
}

function cosDeg(deg: number): number {
	return Math.cos(deg * 2.0 * Math.PI / 360.0);
}

function mod(a: number, b: number): number {
	const result = a % b;
	return result < 0 ? result + b : result;
}

function calc(latitude: number, longitude: number, isSunrise: boolean, zenith: number, date: Date): Date {
	const dayOfYear = getDayOfYear(date);
	const hoursFromMeridian = longitude / degreesPerHour;
	const approxTimeOfEventInDays = isSunrise ? dayOfYear + ((6 - hoursFromMeridian) / 24) : dayOfYear + ((18.0 - hoursFromMeridian) / 24);

	const sunMeanAnomaly = (0.9856 * approxTimeOfEventInDays) - 3.289;
	const sunTrueLongitude = mod(sunMeanAnomaly + (1.916 * sinDeg(sunMeanAnomaly)) + (0.020 * sinDeg(2 * sunMeanAnomaly)) + 282.634, 360);
	const ascension = 0.91764 * tanDeg(sunTrueLongitude);

	let rightAscension;
	rightAscension = 360 / (2 * Math.PI) * Math.atan(ascension);
	rightAscension = mod(rightAscension, 360);

	const lQuadrant = Math.floor(sunTrueLongitude / 90) * 90;
	const raQuadrant = Math.floor(rightAscension / 90) * 90;
	rightAscension = rightAscension + (lQuadrant - raQuadrant);
	rightAscension /= degreesPerHour;

	const sinDec = 0.39782 * sinDeg(sunTrueLongitude);
	const cosDec = cosDeg(asinDeg(sinDec));
	const cosLocalHourAngle = ((cosDeg(zenith)) - (sinDec * (sinDeg(latitude)))) / (cosDec * (cosDeg(latitude)));

	const localHourAngle = isSunrise ? 360 - acosDeg(cosLocalHourAngle)	: acosDeg(cosLocalHourAngle);

	const localHour = localHourAngle / degreesPerHour;
	const localMeanTime = localHour + rightAscension - (0.06571 * approxTimeOfEventInDays) - 6.622;
	const time = mod(localMeanTime - (longitude / degreesPerHour), 24);
	const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

	return new Date(utcMidnight + (time * msecInHour));
}

function getSunrise(date = new Date(), latitude = defaultLatitude, longitude = defaultLongitude): Date {
	return calc(latitude, longitude, true, defaultZenith, date);
}

function getSunset(date = new Date(), latitude = defaultLatitude, longitude = defaultLongitude): Date {
	return calc(latitude, longitude, false, defaultZenith, date);
}

export function isTimeDarkmode(): boolean {
	const now = new Date();
	const yesterday = new Date();
	yesterday.setDate(now.getDate() - 1);

	const sunrise = getSunrise(yesterday);
	const sunset = getSunset();

	return sunset <= now || now <= sunrise;
}

export function initializeTimeBasedDarkmode(): void {
	const isDarkmode = isTimeDarkmode();
	store.set('darkMode', isDarkmode);

	const nextTargetTime = (isDarkmode ? getSunrise() : getSunset()).getTime() - Date.now() + 1000;
	console.log(`nextThemeChange: ${new Date(Date.now() + nextTargetTime)}`);

	window.setTimeout(() => {
		initializeTimeBasedDarkmode();
	}, nextTargetTime);
}
