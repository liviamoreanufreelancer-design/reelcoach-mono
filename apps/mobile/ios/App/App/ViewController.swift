import UIKit
import Capacitor

/**
 * Controlerul appului — exista ca sa inregistreze pluginurile proprii.
 *
 * DE CE E NEVOIE DE EL
 *
 * Capacitor 8 NU caută clasele de plugin prin scanare. `registerPlugins()`
 * citeste `packageClassList` din `capacitor.config.json` — lista generata de
 * `cap sync` din pachetele npm instalate — si inregistreaza doar ce e acolo.
 * Un plugin scris in appul propriu nu apare niciodata acolo, fiindca nu e un
 * pachet npm: e compilat, legat in binar, si invizibil pentru punte.
 *
 * `registerPluginInstance`, NU `registerPluginType`
 *
 * Capcana care a costat o runda: `registerPluginType` incepe cu
 *
 *     if autoRegisterPlugins { return }
 *
 * Deci nu face NIMIC cand inregistrarea automata e activa — adica implicit.
 * Metoda e pentru appurile care o opresc. Apelul arata corect, compila, si era
 * un no-op tacut.
 *
 * `registerPluginInstance` n-are gardianul: ia o instanta, o pune in registru
 * si exporta puntea JavaScript pentru ea.
 *
 * VERIFICAREA DE DUPA nu e paranoia. Tot ce a mers prost in functia asta a
 * mers prost in tacere: plugin neinregistrat, `catch` care inghitea eroarea,
 * metoda care se intoarce din prima linie. Daca se rupe iar, vrem sa scrie in
 * log, nu sa dispara.
 */
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        guard let bridge = bridge else {
            CAPLog.print("⚡️ ❌ FrameVision: puntea lipsește în capacitorDidLoad")
            return
        }

        bridge.registerPluginInstance(FrameVisionPlugin())

        if bridge.plugin(withName: "FrameVision") == nil {
            CAPLog.print("⚡️ ❌ FrameVision NU s-a înregistrat — apelurile din JS vor da UNIMPLEMENTED")
        } else {
            CAPLog.print("⚡️ ✅ FrameVision înregistrat")
        }
    }
}
