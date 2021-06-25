exports.handler = async (event) => {
  console.log('request:', JSON.stringify(event, undefined, 2))
  if (process.env.ALLOW === 'true') {
    return { allow: true }
  } else {
    return { allow: false }
  }
}
