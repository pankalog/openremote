//
//  ConfigManagerTest.swift
//  Tests
//
//  Created by Eric Bariaux on 31/08/2022.
//

import XCTest

@testable import ORLib

class ConfigManagerTest: XCTestCase {

    let configManager = ConfigManager(apiManagerFactory: { url in
        FileApiManager(baseUrl: url)
    })

    func test0() async throws {
        var state = try await configManager.setDomain(domain: "test0")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test0.openremote.app", "manager", nil))
        state = try configManager.setRealm(realm: "master")
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test0.openremote.app", app: "manager", realm: "master")))
    }

    func test1() async throws {
        let state = try await configManager.setDomain(domain: "test1")
            XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test1.openremote.app", app: "manager", realm: nil)))
    }

    func test2() async throws {
        var state = try await configManager.setDomain(domain: "test2")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test2.openremote.app", "Console 1", nil))
        state = try configManager.setRealm(realm: nil)
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test2.openremote.app", app: "Console 1", realm: nil)))
    }

    func test3() async throws {
        var state = try await configManager.setDomain(domain: "test3")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test3.openremote.app", "Console 1", nil))
        state = try configManager.setRealm(realm: "master")
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test3.openremote.app", app: "Console 1", realm: "master")))
    }

    func test4() async throws {
        var state = try await configManager.setDomain(domain: "test4")
        XCTAssertEqual(state, ConfigManagerState.selectApp("https://test4.openremote.app", ["Console 1", "Console 2"]))
        state = try configManager.setApp(app: "Console 1")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test4.openremote.app", "Console 1", nil))
        state = try configManager.setRealm(realm: nil)
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test4.openremote.app", app: "Console 1", realm: nil)))
    }

    func test5() async throws {
        var state = try await configManager.setDomain(domain: "test5")
        XCTAssertEqual(state, ConfigManagerState.selectApp("https://test5.openremote.app", nil))
        state = try configManager.setApp(app: "Console")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test5.openremote.app", "Console", nil))
        state = try configManager.setRealm(realm: "master")
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test5.openremote.app", app: "Console", realm: "master")))
    }

    func test6() async throws {
        var state = try await configManager.setDomain(domain: "test6")
        XCTAssertEqual(state, ConfigManagerState.selectApp("https://test6.openremote.app", ["Console 1", "Console 2"]))
        state = try configManager.setApp(app: "Console 2")
        XCTAssertEqual(state, ConfigManagerState.selectRealm("https://test6.openremote.app", "Console 2", nil))
        state = try configManager.setRealm(realm: "master")
        XCTAssertEqual(state, ConfigManagerState.complete(ProjectConfig(domain: "https://test6.openremote.app", app: "Console 2", realm: "master")))
    }
}
