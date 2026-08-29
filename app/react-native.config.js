// ML Kit ships no arm64-simulator slice (its pods set
// EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64), and iOS 27 simulator
// runtimes no longer run x86_64 apps under Rosetta — so the pod cannot be
// linked into a simulator build at all. Exclude it from iOS autolinking;
// ScanScreen already falls back to "type the list instead" when OCR is
// unavailable. Delete this override when building for a real device.
module.exports = {
  dependencies: {
    "@react-native-ml-kit/text-recognition": {
      platforms: { ios: null },
    },
  },
};
