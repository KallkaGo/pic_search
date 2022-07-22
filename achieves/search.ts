import bot from "ROOT";
import { InputParameter } from "@modules/command";
import { formatRowMessage } from "#pic_search/utils/utils";
import { sauceNAOSearch } from "#pic_search/utils/api";
import { checkSauceNAOSearchStatus } from "#pic_search/types/check";
import { keys, config } from "#pic_search/init";
import { ISauceNAOResponseError, ISauceNAOResponseSuccess, ISauceNAOResult } from "#pic_search/types/SauceNAO";

enum ErrorMsg {
	CANNOT_AT = "未开启 at 查询头像功能",
	NOT_FOUNT = "未找到类似图片",
	EMPTY = "请在指令后跟随图片",
	EMPTY_AT = "请在指令后跟随图片或@用户",
	OVERFLOW = "不得超过三张图片",
	ERROR_MESSAGE = "识图api请求出错",
	INCOMPLETE_RESULTS = "*服务端异常，结果可能不完全"
}

const keyToDiy = {
	title: "标题",
	eng_name: "标题（英）",
	jp_name: "标题（日）",
	tweet_id: "twitter_id",
	pixiv_id: "pixiv_id",
	yandere_id: "yandere_id",
	gelbooru_id: "gelbooru_id",
	danbooru_id: "danbooru_id",
	creator: "作者",
	member_id: "作者id(pixiv)",
	member_name: "作者(pixiv)",
	twitter_user_id: "作者id(推特)",
	twitter_user_handle: "作者用户名(推特)",
	created_at: "发布日期",
	user_id: "作者id（pixiv Fanbox）",
	user_name: "作者（pixiv Fanbox）",
	publish: "发布日期（pixiv Fanbox）",
	service_name: "发布地址",
	ext_urls:'链接地址'
}

export async function main( { sendMessage, messageData, logger }: InputParameter ): Promise<void> {
	const { message, message_type } = messageData;
	
	const recImage: any[] = message.filter( m => m.type === "image" );
	const recAt: any[] = message.filter( m => m.type === "at" );
	
	const recMessage: any[] = config.at ? [ ...recImage, ...recAt ] : [ ...recImage ];
	
	if ( !recMessage.length ) {
		if ( config.at ) {
			await sendMessage( ErrorMsg.EMPTY_AT );
		} else {
			await sendMessage( recAt.length ? ErrorMsg.CANNOT_AT : ErrorMsg.EMPTY );
		}
		return;
	}
	
	if ( recMessage.length > 3 ) {
		await sendMessage( ErrorMsg.OVERFLOW );
		return;
	}
	
	const rowMessageArr: string[] = [];
	
	/* 群聊@换行处理 */
	if ( message_type === "group" && bot.config.atUser ) {
		rowMessageArr.push( " " );
	}
	
	!config.multiple && ( recMessage.length = 1 );
	
	let imgIndex = 0;
	
	for ( const rec of recMessage ) {
		imgIndex++
		config.multiple && rowMessageArr.push( `---第${ imgIndex }张搜索结果---` );
		let url: string;
		if ( rec.type === "image" ) {
			url = rec.data.url;
		} else {
			url = `https://q1.qlogo.cn/g?b=qq&s=640&nk=${ rec.data.qq }`;
		}
		
		let api_key = keys.getKey();
		
		let result: ISauceNAOResponseSuccess | ISauceNAOResponseError;
		try {
			result = await sauceNAOSearch( { api_key, url } );
		} catch ( error ) {
			logger.error( error );
			rowMessageArr.push( ErrorMsg.ERROR_MESSAGE );
			continue;
		}
		
		if ( !checkSauceNAOSearchStatus( result ) ) {
			rowMessageArr.push( result.header.message || ErrorMsg.ERROR_MESSAGE );
			/* 当前keys无效时，切换 */
			if ( result.header.status === -1 ) {
				keys.increaseIndex();
			}
			continue;
		}
		
		/* keys次数用完时，切换 */
		if ( result.header.long_remaining === 0 ) {
			keys.increaseIndex();
		}
		
		/* 当状态为3时，查询结果不完全 */
		if ( result.header.status === 3 ) {
			rowMessageArr.push( ErrorMsg.INCOMPLETE_RESULTS );
		}
		
		/* 获取前两个相似度匹配的数据 */
		const gottenResult = result.results.filter( r => Number( r.header.similarity ) >= config.similarity ).slice( 0, 2 );
		
		if ( !gottenResult.length ) {
			rowMessageArr.push( ErrorMsg.NOT_FOUNT );
			continue;
		}
		
		const sendMessageObj: { [field: string]: string } = {};
		
		/* 生成返回数据对象方法 */
		const setMessageData = ( data: ISauceNAOResult["data"], key: string, diyKey: string ) => {
			if ( data[key] && !sendMessageObj[diyKey] ) {
				if(Array.isArray(data[key])){
					data[key] = data[key][0]
				}
				sendMessageObj[diyKey] = data[key];
			}
		}
		
		/* 生成返回数据对象 */
		for ( const { data } of gottenResult ) {
			for ( const k in keyToDiy ) {
				setMessageData( data, k, keyToDiy[k] );
			}
		}
		
		/* 根据数据对象生成返回数据 */
		for ( const sKey in sendMessageObj ) {
			rowMessageArr.push( `${ sKey }：${ sendMessageObj[sKey] }` );
		}
	}
	console.log(rowMessageArr)
	await sendMessage( formatRowMessage( rowMessageArr ) );
}
