import { Config } from "@remotion/cli/config";

// Max-quality production renders. crf 14 is visually lossless for our
// flat-color animation content (cream ground + ink text + magenta
// singletons), and the file size penalty is bearable since the cuts
// are short. JPEG image format keeps the per-frame disk cost cheap.

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
Config.setCodec("h264");
Config.setCrf(14);
// 320kbps audio so the editor's bed track survives compression even
// though our cuts are silent.
Config.setAudioBitrate("320k");
