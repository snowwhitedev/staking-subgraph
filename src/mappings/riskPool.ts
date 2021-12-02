import { Transfer } from '../types/templates/RiskPool/RiskPool'
import { RiskPool } from '../types/schema'
import { convertTokenToDecimal, BI_18, ADDRESS_ZERO } from './helpers'

export function handleRiskPool(event: Transfer): void {
  let riskPool = RiskPool.load(event.address.toHexString())

  let from = event.params.from
  let to = event.params.to
  let value = convertTokenToDecimal(event.params.value, BI_18)

  // mint
  if (from.toHexString() == ADDRESS_ZERO) {
    riskPool.totalSupply = riskPool.totalSupply.plus(value)
    riskPool.save()
  }

  //burn
  if (to.toHexString() == ADDRESS_ZERO) {
    riskPool.totalSupply = riskPool.totalSupply.minus(value)
    riskPool.save()
  }
}
