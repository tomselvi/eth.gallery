import { Inject, Injectable } from "@angular/core"

import { SocketService } from "./socket.service"
import { Web3Service } from "./web3.service"

@Injectable()
export class AccountService {
  public loggedIn: boolean
  public account

  constructor(
    @Inject(SocketService) private socketService: SocketService,
    @Inject(Web3Service) private web3Service: Web3Service,
  ) {}

  load(): Promise<any> {
    return this.me()
      .then((account) => {
        const lsAddress = sessionStorage.getItem("address")
        const lsSig = sessionStorage.getItem("sig")

        if (!account && lsSig && lsAddress && lsAddress === this.web3Service.getAddress()) {
          return this.login()
            .then((success) => {
              if (!success) {
                sessionStorage.removeItem("address")
                sessionStorage.removeItem("sig")

                return
              }

              return this.me()
            })
        }
        else if (account) {
          this.account = account
          this.loggedIn = true

          return
        }
        else {
          sessionStorage.removeItem("address")
          sessionStorage.removeItem("sig")
        }
      })
  }

  me(): Promise<any> {
    return new Promise((resolve, reject) => {
      const onMe = (account) => {
        this.account = account

        this.socketService.socket.removeListener("account:me", onMe)
        resolve(account)
      }

      this.socketService.socket.on("account:me", onMe)
      this.socketService.socket.emit("account:me")
    })
  }

  logout(): Promise<any> {
    return new Promise((resolve, reject) => {
      const onLogout = (loggedOut) => {
        this.loggedIn = !loggedOut

        this.socketService.socket.removeListener("account:logout", onLogout)

        resolve(loggedOut)
      }

      this.socketService.socket.on("account:logout", onLogout)
      this.socketService.socket.emit("account:logout")
    })
  }

  login(address = this.web3Service.getAddress()): Promise<any> {
    return new Promise((resolve, reject) => {
      const lsSig = sessionStorage.getItem("sig")
      const lsAddress = sessionStorage.getItem("address")

      const sigPromise = (lsSig && lsAddress === this.web3Service.getAddress())
        ? Promise.resolve(lsSig)
        : this.web3Service.signMessage("ETH.gallery")

      sigPromise
        .then((sig) => {
          const onLogin = (loggedIn) => {
            this.loggedIn = loggedIn

            sessionStorage.setItem("address", address)
            sessionStorage.setItem("sig", sig)

            this.socketService.socket.removeListener("account:login", onLogin)
            resolve(loggedIn)
          }

          this.socketService.socket.on("account:login", onLogin)
          this.socketService.socket.emit("account:login", address, sig)
        })
        .catch(reject)
    })
  }

  register(address, email, nickname): Promise<any> {
    return new Promise((resolve, reject) => {
      this.web3Service.signMessage("ETH.gallery")
        .then((sig) => {
          const onRegister = (loggedIn) => {
            this.loggedIn = loggedIn

            sessionStorage.setItem("address", address)
            sessionStorage.setItem("sig", sig)

            this.socketService.socket.removeListener("account:register", onRegister)
            resolve(loggedIn)
          }

          this.socketService.socket.on("account:register", onRegister)
          this.socketService.socket.emit("account:register", address, email, nickname, sig)
        })
        .catch(reject)
    })
  }
}
