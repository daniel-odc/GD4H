# 04/11/2026
- Managed files encoding on home page

# 03/11/2026
- Update Node to `v24.22.2`, React to `React19`, `antd6` etc. and updated all dependant libs in `package.json`
- Add Api key for background maps: `REACT_APP_CARTO_API_KEY` in `.env.local`
- Move GIS layers (`communes.json` etc.) to cloud bucket:
- Add env variable `REACT_APP_BUCKET_GEODATA=https://storage.googleapis.com/public-bucket-odc-data/geodata/France/` and update code to use it instead of plain url
- change default to no zones loaded to files have time to load while user is uploading the csv file
- simplify geometries
- Redirected links to INERIS rather than GD4H (to check)
- change version in footer

