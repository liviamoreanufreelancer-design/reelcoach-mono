import Foundation
import Capacitor
import Vision
import UIKit

/**
 * FrameVision — unde e subiectul în cadru.
 *
 * CE FACE, ȘI CE NU FACE
 *
 * Primește un cadru și întoarce o casetă. Nu ia camera, nu înregistrează, nu
 * atinge nimic din lanțul de captură. Camera rămâne în WebView, cu
 * `getUserMedia`, iar `MediaRecorder` și randarea nu știu că pluginul există.
 *
 * Forma asta e deliberată: dacă analiza nu merge, se scoate și nu se rupe
 * nimic din export. Două sesiuni de captură pe aceeași cameră ar fi intrat în
 * conflict, iar mutarea camerei pe nativ ar fi fost rescrierea pe care notele
 * de produs o resping.
 *
 * DOUĂ CĂI, ÎN ORDINEA ÎNCREDERII
 *
 *   1. Fața — `VNDetectFaceRectanglesRequest`. Precis și documentat. Acoperă
 *      cadrele cu om în ele: before, consultația, reacția, dezvăluirea.
 *
 *   2. Subiectul proeminent — `VNGenerateObjectnessBasedSaliencyImageRequest`.
 *      Pentru detalii, unde nu e nicio față: folii, mâini, unghii. Masca e
 *      grosieră (Apple raportează 64×64), dar noi alegem între patru praguri
 *      de umplere, nu măsurăm milimetri.
 *
 * Întoarce `null` când nu găsește nimic. Appul ascunde pastila atunci — mai
 * bine niciun sfat decât un sfat greșit.
 *
 * COORDONATE: Vision numără de jos în sus, CSS de sus în jos. Conversia se
 * face aici, o dată, ca JavaScript-ul să primească direct coordonate de ecran.
 */
@objc(FrameVisionPlugin)
public class FrameVisionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FrameVisionPlugin"
    public let jsName = "FrameVision"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "analyzeFrame", returnType: CAPPluginReturnPromise)
    ]

    @objc func analyzeFrame(_ call: CAPPluginCall) {
        guard let dataUrl = call.getString("image") else {
            call.reject("lipsește `image`")
            return
        }

        // Acceptă și `data:image/jpeg;base64,...` și base64 curat, ca partea de
        // JavaScript să nu trebuiască să taie prefixul.
        let base64 = dataUrl.contains(",")
            ? String(dataUrl[dataUrl.index(after: dataUrl.firstIndex(of: ",")!)...])
            : dataUrl

        guard let data = Data(base64Encoded: base64),
              let image = UIImage(data: data),
              let cgImage = image.cgImage else {
            call.reject("cadrul nu s-a putut decoda")
            return
        }

        // Analiza pe firul principal ar bloca interfața la fiecare cadru.
        DispatchQueue.global(qos: .userInitiated).async {
            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])

            // ── 1 · Fața, dacă există ──
            let faceRequest = VNDetectFaceRectanglesRequest()
            if let _ = try? handler.perform([faceRequest]),
               let faces = faceRequest.results, !faces.isEmpty {
                // Cea mai mare față: dacă sunt două persoane în cadru, clienta
                // e de obicei cea mai apropiată, deci cea mai mare.
                let biggest = faces.max { a, b in
                    a.boundingBox.height < b.boundingBox.height
                }!
                call.resolve(self.payload(from: biggest.boundingBox, source: "face"))
                return
            }

            // ── 2 · Subiectul proeminent, când nu e nicio față ──
            let salRequest = VNGenerateObjectnessBasedSaliencyImageRequest()
            if let _ = try? handler.perform([salRequest]),
               let obs = salRequest.results?.first as? VNSaliencyImageObservation,
               let objects = obs.salientObjects, !objects.isEmpty {
                // Reuniunea casetelor, nu doar cea mai mare: la folii, subiectul
                // real sunt mai multe pete apropiate, iar una singură l-ar
                // subestima — apoi appul ar spune „mai aproape" degeaba.
                var box = objects[0].boundingBox
                for o in objects.dropFirst() {
                    box = box.union(o.boundingBox)
                }
                call.resolve(self.payload(from: box, source: "salient"))
                return
            }

            // Nimic găsit. Appul ascunde pastila: mai bine niciun sfat decât unul greșit.
            call.resolve(["found": false])
        }
    }

    /// Vision numără de jos în sus; CSS de sus în jos. Conversia, o dată, aici.
    private func payload(from box: CGRect, source: String) -> [String: Any] {
        return [
            "found": true,
            "source": source,
            "x": box.origin.x,
            "y": 1.0 - (box.origin.y + box.height),
            "width": box.width,
            "height": box.height
        ]
    }
}
