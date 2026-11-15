import UIKit
import Capacitor

/**
 * Controlerul appului — exista ca sa inregistreze pluginurile proprii.
 *
 * DE CE E NEVOIE DE EL, si de ce lipsa lui n-a dat nicio eroare:
 *
 * Capacitor 8 NU caută clasele de plugin prin scanare. Citeste
 * `packageClassList` din `capacitor.config.json` — o lista generata de `cap
 * sync` din pachetele npm instalate — si inregistreaza doar ce e acolo. Un
 * plugin scris in appul propriu nu apare niciodata in lista, fiindca nu e un
 * pachet npm.
 *
 * Deci `FrameVision` era compilat, legat in binar, si complet invizibil pentru
 * puntea JavaScript. Apelurile eșuau, iar partea de TypeScript le prindea in
 * tacere si intorcea `null` — asa ca pe ecran nu apărea nimic si nici o
 * eroare. Cel mai prost fel de eșec.
 *
 * `capacitorDidLoad()` e punctul in care puntea exista dar nu a pornit
 * JavaScript-ul, deci inregistrarea prinde primul apel.
 *
 * Orice plugin nativ scris de aici inainte trebuie adaugat mai jos.
 */
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginType(FrameVisionPlugin.self)
    }
}
