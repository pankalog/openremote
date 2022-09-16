//
//  WizardRealmViewController.swift
//  GenericApp
//
//  Created by Eric Bariaux on 21/07/2022.
//  Copyright © 2022 OpenRemote. All rights reserved.
//

import UIKit
import MaterialComponents.MaterialTextFields
import ORLib

class WizardRealmViewController: UIViewController {
    
    @IBOutlet weak var realmTextInput: ORTextInput!
    @IBOutlet weak var nextButton: MDCRaisedButton!
    
    var realmName: String?
    
    override func viewDidLoad() {
        super.viewDidLoad()

        let orGreenColor = UIColor(named: "or_green")

        nextButton.backgroundColor = orGreenColor
        nextButton.tintColor = UIColor.white
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        realmTextInput.textField?.delegate = self
        realmTextInput.textField?.autocorrectionType = .no
        realmTextInput.textField?.autocapitalizationType = .none
        realmTextInput.textField?.returnKeyType = .next
    }
    
    @IBAction func nextButtonpressed(_ sender: UIButton) {
        /*
        if let domain = domainName {
            requestAppConfig(domain)
        }
         */
        self.performSegue(withIdentifier: "goToWebView", sender: self)
    }
}

extension WizardRealmViewController: UITextFieldDelegate {

    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        if textField == realmTextInput.textField {
            realmName = realmTextInput.textField?.text?.appending(string).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return true
    }

    /*
    fileprivate func requestAppConfig(_ domain: String) {
        configManager = ConfigManager(apiManagerFactory: { url in
            HttpApiManager(baseUrl: url)
        })

        async {
            let state = try await configManager!.setDomain(domain: domain)
            print("State \(state)")
            switch state {
            case .selectDomain:
                // Something wrong, we just set the domain
                let alertView = UIAlertController(title: "Error", message: "Error occurred getting app config. Check your input and try again", preferredStyle: .alert)
                alertView.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))

                self.present(alertView, animated: true, completion: nil)
            case .selectApp(_, let apps):
                self.apps = apps
                self.performSegue(withIdentifier: "goToWizardAppView", sender: self)
            case .selectRealm(let baseURL, let realms):
                self.performSegue(withIdentifier: "goToWizardRealmView", sender: self)
            case.complete(let baseURL, let app, let realm):
                self.performSegue(withIdentifier: "goToWebView", sender: self)
            }
        }
    }
     */

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        guard let input = textField.text, !input.isEmpty else {
            return false
        }

        if textField == realmTextInput.textField, let realm = realmName {
            realmTextInput.textField?.resignFirstResponder()
//            requestAppConfig(domain)
        }

        return true
    }
}