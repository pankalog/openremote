//
//  ORViewController.swift
//  or-shell
//
//  Created by William Balcaen on 02/02/17.
//  Copyright © 2017 OpenRemote. All rights reserved.
//

import Foundation
import UIKit
import WebKit

class ORViewcontroller : UIViewController, URLSessionDelegate, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    
    var data : Data?
    var myWebView : WKWebView?
    var defaults : UserDefaults?
    var webCfg : WKWebViewConfiguration?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.white
        self.configureAccess()
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let defaults = UserDefaults(suiteName: AppGroup.entitlement)
        defaults?.set(message.body, forKey: message.name)
        defaults?.synchronize()
        
    }
    
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        NSLog("error %@", message)
        TokenManager.sharedInstance.resetToken()
        self.dismiss(animated: true, completion: nil)
        completionHandler()
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if (navigationAction.request.url?.absoluteString.contains("logout"))! {
            decisionHandler(.allow)
            TokenManager.sharedInstance.didLogOut = true
            self.dismiss(animated: false, completion: nil)
        } else {
            decisionHandler(.allow)
        }
    }
    
    
    // just for testing purpose (ask backend to get list of notifications or send a notification to device)
    func apiCall() {
        UIApplication.shared.isNetworkActivityIndicatorVisible = true
        TokenManager.sharedInstance.getAccessToken { (accessTokenResult) in
            switch accessTokenResult {
            case .Failure(let error) :
                ErrorManager.showError(error: error!)
            case .Success(let accessToken) :
            guard let urlRequest = URL(string: String(Server.apiTestResource)) else { return }
            let request = NSMutableURLRequest(url: urlRequest)
            request.httpMethod = "GET" // post to create a notification alert, get to get a list of notification alerts
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = "{\"title\" :\" notif alert title\",\"message\" : \"notif alert message\",\"appUrl\" : \"Veilig\",\"actions\": [ {\"title\" : \"Open link\" , \"type\": \"ACTION_DEEP_LINK\"},{\"title\" : \"background call\" , \"type\": \"ACTION_ACTUATOR\" , \"assetId\" : \"2E2vrICRSEa6mfzOquZzxA\", \"attributeName\" : \"targetTemp\", \"rawJson\" : \"18\" } ]}".data(using: .utf8)
            request.addValue(String(format:"Bearer %@", accessToken!), forHTTPHeaderField: "Authorization")
            let sessionConfiguration = URLSessionConfiguration.default
            let session = URLSession(configuration: sessionConfiguration, delegate: self, delegateQueue : nil)
            let reqDataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) in
                DispatchQueue.main.async {
                    UIApplication.shared.isNetworkActivityIndicatorVisible = false
                    if (error != nil) {
                        NSLog("error %@", (error! as NSError).localizedDescription)
                        let error = NSError(domain: "", code: 0, userInfo:  [
                            NSLocalizedDescriptionKey :  NSLocalizedString("ErrorCallingAPI", value: "Could not get data", comment: "")
                            ])
                        ErrorManager.showError(error: error)
                    } else {
                        print(response.debugDescription)
                        _ = self.myWebView?.load(data!, mimeType: "text/html", characterEncodingName: "utf8", baseURL: URL(string:Server.apiTestResource)!)
                    }
                }
            })
            reqDataTask.resume()
        }
        }
    }
    
    func login() {
        guard let request = URL(string: String(format:"https://%@/%@",Server.hostURL,Server.initialPath)) else { return }
        UIApplication.shared.isNetworkActivityIndicatorVisible = true
        _ = self.myWebView?.load(URLRequest(url: request))
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        NSLog("error %@", error.localizedDescription)
        UIApplication.shared.isNetworkActivityIndicatorVisible = false
        ErrorManager.showError(error: NSError(domain: "networkError", code: 0, userInfo:[
            NSLocalizedDescriptionKey :  NSLocalizedString("FailedLoadingPage", value: "Could not load page", comment: "")
            ]))
    }
    
    func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust) {
            if challenge.protectionSpace.host == Server.hostURL {
                completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
            } else {
                completionHandler(.performDefaultHandling, nil)
            }
            
        }
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        UIApplication.shared.isNetworkActivityIndicatorVisible = false
    }
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust) {
            if challenge.protectionSpace.host == Server.hostURL {
                completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
            } else {
                completionHandler(.performDefaultHandling, nil)
            }
            
        }
    }
    
    func configureAccess() {
        webCfg = WKWebViewConfiguration()
        let userController:WKUserContentController = WKUserContentController()
        
        userController.add(self, name: DefaultsKey.offlineToken)
        userController.add(self, name: DefaultsKey.refreshToken)
        userController.add(self, name: DefaultsKey.idToken)
        
        var exec_template = "var iOSToken"
        if TokenManager.sharedInstance.hasToken {
            exec_template = String(format: "var iOSToken = \"%@\"; var iOSRefreshToken = \"%@\"; var iOSTokenId = \"%@\";", TokenManager.sharedInstance.offlineToken!, TokenManager.sharedInstance.refreshToken!, TokenManager.sharedInstance.idToken!)
        }
        
        let userScript:WKUserScript = WKUserScript(source: exec_template, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        userController.addUserScript(userScript)
        
        webCfg?.userContentController = userController;
        let sbHeight = UIApplication.shared.statusBarFrame.height
        let webFrame = CGRect(x : 0,y : sbHeight,width : view.frame.size.width,height : view.frame.size.height - sbHeight)
        myWebView = WKWebView(frame: webFrame, configuration: webCfg!)
        myWebView?.uiDelegate = self;
        myWebView?.navigationDelegate = self;
        view.addSubview(myWebView!)
        
        //self.apiCall()
        self.login()
    }
    
    func loadURL(url : URL) {
        UIApplication.shared.isNetworkActivityIndicatorVisible = true
        _ = self.myWebView?.load(URLRequest(url:url))
    }
    
    func updateAssetAttribute(assetId : String, attributeName : String, rawJson : String) {
        UIApplication.shared.isNetworkActivityIndicatorVisible = true
        TokenManager.sharedInstance.getAccessToken { (accessTokenResult) in
            switch accessTokenResult {
            case .Failure(let error) :
                ErrorManager.showError(error: error!)
            case .Success(let accessToken) :
            guard let urlRequest = URL(string: String(String(format: "https://%@/%@/asset/%@/attribute/%@", Server.hostURL, Server.realm, assetId,attributeName))) else { return }
            print(urlRequest)
            let request = NSMutableURLRequest(url: urlRequest)
            request.httpMethod = "PUT"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = rawJson.data(using: .utf8)
            request.addValue(String(format:"Bearer %@", accessToken!), forHTTPHeaderField: "Authorization")
            let sessionConfiguration = URLSessionConfiguration.default
            let session = URLSession(configuration: sessionConfiguration, delegate: self, delegateQueue : nil)
            let reqDataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) in
                DispatchQueue.main.async {
                    UIApplication.shared.isNetworkActivityIndicatorVisible = false
                    if (error != nil) {
                        NSLog("error %@", (error! as NSError).localizedDescription)
                        let error = NSError(domain: "", code: 0, userInfo:  [
                            NSLocalizedDescriptionKey :  NSLocalizedString("ErrorCallingAPI", value: "Could not get data", comment: "")
                            ])
                        ErrorManager.showError(error: error)
                    } else {
                        print(response.debugDescription)
                    }
                }
            })
            reqDataTask.resume()
        }
        }
    }

    
}
