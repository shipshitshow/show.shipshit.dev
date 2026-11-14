// vocr <frames.txt>: Apple Vision text recognition (.accurate) for every image path listed (one per line).
// Prints one JSON object per image to stdout: {"file", "w", "h", "lines": [{"text", "conf", "box": [x,y,w,h], "tokens": [{"start","end","box"}]}]}
// Boxes are in pixels, origin top-left. "tokens" are whitespace-separated words with their character range inside "text",
// so the caller can map a regex match back to a pixel box. Text is not logged anywhere else.
import Foundation
import Vision
import ImageIO

func boxPx(_ r: CGRect, _ w: Double, _ h: Double) -> [Double] {
  [(r.minX * w).rounded(), ((1 - r.maxY) * h).rounded(), (r.width * w).rounded(), (r.height * h).rounded()]
}

let paths = try! String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
  .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
for path in paths {
  guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
  let w = Double(img.width), h = Double(img.height)
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = false  // keys and paths are not words; correction would "fix" them
  req.minimumTextHeight = 0.006
  try! VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
  var lines: [[String: Any]] = []
  for obs in req.results ?? [] {
    guard let cand = obs.topCandidates(1).first else { continue }
    let s = cand.string
    var tokens: [[String: Any]] = []
    var i = s.startIndex
    while i < s.endIndex {
      if s[i] == " " { i = s.index(after: i); continue }
      var j = i
      while j < s.endIndex && s[j] != " " { j = s.index(after: j) }
      if let rb = try? cand.boundingBox(for: i..<j) {
        tokens.append(["start": s.distance(from: s.startIndex, to: i), "end": s.distance(from: s.startIndex, to: j),
                       "box": boxPx(rb.boundingBox, w, h)])
      }
      i = j
    }
    lines.append(["text": s, "conf": Double(cand.confidence), "box": boxPx(obs.boundingBox, w, h), "tokens": tokens])
  }
  let obj: [String: Any] = ["file": path, "w": Int(w), "h": Int(h), "lines": lines]
  let data = try! JSONSerialization.data(withJSONObject: obj)
  print(String(data: data, encoding: .utf8)!)
}
