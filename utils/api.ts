import fetch from "node-fetch";
import { formatGetURL, IParams } from "./utils";
import { ISauceNAOResponseSuccess, ISauceNAOResponseError } from "#pic_search/types/SauceNAO";

const _api = {
	sauce_nao_search: "https://saucenao.com/search.php"
}
/* https://saucenao.com/search.php?db=999&output_type=2&testmode=1&numres=16&url=http%3A%2F%2Fsaucenao.com%2Fimages%2Fstatic%2Fbanner.gif */
export function sauceNAOSearch( params: IParams | undefined ): Promise<ISauceNAOResponseSuccess | ISauceNAOResponseError> {
	const url = formatGetURL( _api.sauce_nao_search, {
		db: 999,
		output_type: 2,
		numres: 3,
		...params
	} );
	
	return new Promise( ( resolve, reject ) => {
		fetch( url ).then( async ( result: Response ) => {
			
			if ( result.ok ) {
				const res = await result.json();
				resolve( res );
			}
			reject( new Error( "ERROR" ) );
		} ).catch( ( err: Error ) => {
			reject( err );
		} )
	} )
}