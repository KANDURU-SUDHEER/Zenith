import type { Constellation } from "@/types";

/**
 * Major constellations with approximate center coordinates.
 * This is a simplified dataset for visualization.
 */
export const CONSTELLATIONS: Constellation[] = [
  {
    name: "Orion",
    abbreviation: "Ori",
    rightAscension: 85,
    declination: 2,
    isVisible: false,
    description: "One of the most recognizable constellations, named after the hunter in Greek mythology. Contains the bright stars Betelgeuse and Rigel.",
    stars: [
      { name: "Betelgeuse", rightAscension: 88.79, declination: 7.41, magnitude: 0.5 },
      { name: "Rigel", rightAscension: 78.63, declination: -8.2, magnitude: 0.13 },
      { name: "Bellatrix", rightAscension: 81.28, declination: 6.35, magnitude: 1.64 },
      { name: "Mintaka", rightAscension: 83.0, declination: -0.3, magnitude: 2.23 },
    ],
  },
  {
    name: "Ursa Major",
    abbreviation: "UMa",
    rightAscension: 165,
    declination: 55,
    isVisible: false,
    description: "Contains the Big Dipper asterism. One of the most well-known constellations visible year-round from northern latitudes.",
    stars: [
      { name: "Dubhe", rightAscension: 165.93, declination: 61.75, magnitude: 1.79 },
      { name: "Merak", rightAscension: 165.46, declination: 56.38, magnitude: 2.37 },
      { name: "Alioth", rightAscension: 193.51, declination: 55.96, magnitude: 1.77 },
      { name: "Mizar", rightAscension: 200.98, declination: 54.93, magnitude: 2.27 },
    ],
  },
  {
    name: "Cassiopeia",
    abbreviation: "Cas",
    rightAscension: 15,
    declination: 60,
    isVisible: false,
    description: "Distinctive W-shaped constellation named after a vain queen in Greek mythology. Visible year-round from northern latitudes.",
    stars: [
      { name: "Schedar", rightAscension: 10.13, declination: 56.54, magnitude: 2.23 },
      { name: "Caph", rightAscension: 2.29, declination: 59.15, magnitude: 2.27 },
      { name: "Navi", rightAscension: 14.18, declination: 60.72, magnitude: 2.47 },
    ],
  },
  {
    name: "Scorpius",
    abbreviation: "Sco",
    rightAscension: 255,
    declination: -30,
    isVisible: false,
    description: "A zodiac constellation representing the scorpion that killed Orion. Its brightest star, Antares, is a red supergiant.",
    stars: [
      { name: "Antares", rightAscension: 247.35, declination: -26.43, magnitude: 0.96 },
      { name: "Shaula", rightAscension: 263.4, declination: -37.1, magnitude: 1.63 },
      { name: "Sargas", rightAscension: 264.33, declination: -42.99, magnitude: 1.87 },
    ],
  },
  {
    name: "Leo",
    abbreviation: "Leo",
    rightAscension: 150,
    declination: 15,
    isVisible: false,
    description: "A zodiac constellation representing the Nemean lion. Regulus, its brightest star, lies almost exactly on the ecliptic.",
    stars: [
      { name: "Regulus", rightAscension: 152.09, declination: 11.97, magnitude: 1.35 },
      { name: "Denebola", rightAscension: 177.27, declination: 14.57, magnitude: 2.14 },
      { name: "Algieba", rightAscension: 146.46, declination: 19.84, magnitude: 2.28 },
    ],
  },
  {
    name: "Cygnus",
    abbreviation: "Cyg",
    rightAscension: 310,
    declination: 40,
    isVisible: false,
    description: "The Swan constellation, containing the Northern Cross asterism. Deneb forms part of the Summer Triangle.",
    stars: [
      { name: "Deneb", rightAscension: 310.36, declination: 45.28, magnitude: 1.25 },
      { name: "Sadr", rightAscension: 305.56, declination: 40.26, magnitude: 2.2 },
      { name: "Albireo", rightAscension: 292.68, declination: 27.96, magnitude: 3.08 },
    ],
  },
  {
    name: "Lyra",
    abbreviation: "Lyr",
    rightAscension: 284,
    declination: 36,
    isVisible: false,
    description: "A small constellation containing Vega, the fifth brightest star in the sky and part of the Summer Triangle.",
    stars: [
      { name: "Vega", rightAscension: 279.23, declination: 38.78, magnitude: 0.03 },
      { name: "Sheliak", rightAscension: 282.52, declination: 33.36, magnitude: 3.45 },
    ],
  },
  {
    name: "Gemini",
    abbreviation: "Gem",
    rightAscension: 105,
    declination: 22,
    isVisible: false,
    description: "A zodiac constellation representing the twins Castor and Pollux. Home to the Geminid meteor shower radiant.",
    stars: [
      { name: "Pollux", rightAscension: 116.33, declination: 28.03, magnitude: 1.14 },
      { name: "Castor", rightAscension: 113.65, declination: 31.89, magnitude: 1.93 },
    ],
  },
  {
    name: "Aquila",
    abbreviation: "Aql",
    rightAscension: 296,
    declination: 8,
    isVisible: false,
    description: "The Eagle constellation. Altair, its brightest star, completes the Summer Triangle with Deneb and Vega.",
    stars: [
      { name: "Altair", rightAscension: 297.7, declination: 8.87, magnitude: 0.77 },
      { name: "Tarazed", rightAscension: 296.56, declination: 10.61, magnitude: 2.72 },
    ],
  },
  {
    name: "Canis Major",
    abbreviation: "CMa",
    rightAscension: 101,
    declination: -22,
    isVisible: false,
    description: "Contains Sirius, the brightest star in the night sky. Represents one of Orion's hunting dogs.",
    stars: [
      { name: "Sirius", rightAscension: 101.29, declination: -16.72, magnitude: -1.46 },
      { name: "Adhara", rightAscension: 104.66, declination: -28.97, magnitude: 1.5 },
      { name: "Wezen", rightAscension: 107.1, declination: -26.39, magnitude: 1.84 },
    ],
  },
  {
    name: "Taurus",
    abbreviation: "Tau",
    rightAscension: 65,
    declination: 18,
    isVisible: false,
    description: "A zodiac constellation containing the Pleiades star cluster and the bright star Aldebaran, the eye of the bull.",
    stars: [
      { name: "Aldebaran", rightAscension: 68.98, declination: 16.51, magnitude: 0.85 },
      { name: "Elnath", rightAscension: 81.57, declination: 28.61, magnitude: 1.65 },
    ],
  },
  {
    name: "Virgo",
    abbreviation: "Vir",
    rightAscension: 195,
    declination: -5,
    isVisible: false,
    description: "The largest zodiac constellation. Contains Spica, a binary star system, and the Virgo Cluster of galaxies.",
    stars: [
      { name: "Spica", rightAscension: 201.3, declination: -11.16, magnitude: 0.97 },
      { name: "Porrima", rightAscension: 190.42, declination: -1.45, magnitude: 2.74 },
    ],
  },
];
