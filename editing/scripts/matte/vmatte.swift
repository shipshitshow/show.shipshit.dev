// vmatte <in.mp4> <out.raw>: Apple Vision person segmentation (.accurate) per frame, gray8 masks at native size.
// Writes <out.raw>.json with {w,h,n}. One request reused across frames (Vision keeps temporal state for video).
import Foundation
import AVFoundation
import Vision
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out); reader.startReading()
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
FileManager.default.createFile(atPath: a[2], contents: nil)
let fh = FileHandle(forWritingAtPath: a[2])!
var n = 0, W = 0, H = 0
while let sb = out.copyNextSampleBuffer() {
  guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
  try! VNImageRequestHandler(cvPixelBuffer: pb, options: [:]).perform([req])
  let m = req.results![0].pixelBuffer
  CVPixelBufferLockBaseAddress(m, .readOnly)
  W = CVPixelBufferGetWidth(m); H = CVPixelBufferGetHeight(m)
  let bpr = CVPixelBufferGetBytesPerRow(m); let base = CVPixelBufferGetBaseAddress(m)!.assumingMemoryBound(to: UInt8.self)
  var d = Data(capacity: W * H)
  for y in 0..<H { d.append(base + y * bpr, count: W) }
  CVPixelBufferUnlockBaseAddress(m, .readOnly)
  fh.write(d); n += 1
}
fh.closeFile()
try! "{\"w\":\(W),\"h\":\(H),\"n\":\(n)}".write(toFile: a[2] + ".json", atomically: true, encoding: .utf8)
print("frames", n, W, H)
